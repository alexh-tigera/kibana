/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../../services';
import { agentPolicyService, getAgentPolicySavedObjectType } from '../../services/agent_policy';

import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../../common/constants';

import {
  registerVerifyPermissionsTask,
  scheduleVerifyPermissionsTask,
} from './verify_permissions_task';

jest.mock('../../services/agent_policy_update', () => ({
  agentPolicyUpdateEventHandler: jest.fn(),
}));

jest.mock('../../services/agent_policy', () => ({
  agentPolicyService: {
    list: jest.fn(),
    createVerifierPolicy: jest.fn(),
    deleteVerifierPolicy: jest.fn(),
  },
  getAgentPolicySavedObjectType: jest.fn().mockResolvedValue('ingest-agent-policies'),
}));

jest.mock('../../services/epm/packages', () => ({
  getInstallation: jest.fn().mockResolvedValue({ name: 'aws', version: '2.0.0' }),
  getPackageInfo: jest.fn().mockResolvedValue({ name: 'aws', title: 'AWS', version: '2.0.0' }),
}));

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedGetAgentPolicySavedObjectType = getAgentPolicySavedObjectType as jest.MockedFunction<
  typeof getAgentPolicySavedObjectType
>;

const mockSoClient = {
  find: jest.fn(),
  update: jest.fn(),
} as any;

const mockEsClient = {} as any;

describe('verify_permissions_task', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    const mockContext = createAppContextStartContractMock();
    appContextService.start(mockContext);

    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
    jest
      .spyOn(appContextService, 'getInternalUserSOClientWithoutSpaceExtension')
      .mockReturnValue(mockSoClient);
    jest.spyOn(appContextService, 'getInternalUserESClient').mockReturnValue(mockEsClient);
    jest.spyOn(appContextService, 'getExperimentalFeatures').mockReturnValue({
      enableOTelVerifier: true,
    } as any);

    mockedGetAgentPolicySavedObjectType.mockResolvedValue('ingest-agent-policies');
  });

  describe('registerVerifyPermissionsTask', () => {
    it('should register the task definition', () => {
      const taskManager = taskManagerMock.createSetup();
      registerVerifyPermissionsTask(taskManager);
      expect(taskManager.registerTaskDefinitions).toHaveBeenCalledWith(
        expect.objectContaining({
          'fleet:verify_permissions': expect.objectContaining({
            title: 'OTel Verify Permission Task',
            timeout: '10m',
          }),
        })
      );
    });
  });

  describe('scheduleVerifyPermissionsTask', () => {
    it('should schedule the task with correct parameters', async () => {
      const taskManager = taskManagerMock.createStart();
      await scheduleVerifyPermissionsTask(taskManager);
      expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
        id: 'fleet:verify_permissions:1.0.0',
        taskType: 'fleet:verify_permissions',
        schedule: { interval: '5m' },
        state: {},
        params: {},
      });
    });

    it('should log error if scheduling fails', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.ensureScheduled.mockRejectedValueOnce(new Error('schedule failed'));
      await scheduleVerifyPermissionsTask(taskManager);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error scheduling permission verifier task'),
        expect.anything()
      );
    });
  });

  describe('runPermissionVerifierTask (via task runner)', () => {
    let taskRunner: { run: () => Promise<unknown>; cancel?: () => Promise<unknown> };

    beforeEach(() => {
      const taskManager = taskManagerMock.createSetup();
      registerVerifyPermissionsTask(taskManager);

      const registeredDef =
        taskManager.registerTaskDefinitions.mock.calls[0][0]['fleet:verify_permissions'];
      taskRunner = registeredDef.createTaskRunner({
        taskInstance: {} as any,
        abortController: new AbortController(),
      });
    });

    it('should skip when enableOTelVerifier is disabled', async () => {
      jest.spyOn(appContextService, 'getExperimentalFeatures').mockReturnValue({
        enableOTelVerifier: false,
      } as any);

      await taskRunner.run();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('OTel verifier is disabled')
      );
      expect(mockedAgentPolicyService.list).not.toHaveBeenCalled();
    });

    it('should skip verification when an active non-expired verifier policy exists', async () => {
      mockedAgentPolicyService.list.mockResolvedValueOnce({ items: [] } as any);
      mockedAgentPolicyService.list.mockResolvedValueOnce({
        items: [
          {
            id: 'active-verifier',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      } as any);

      mockSoClient.find.mockResolvedValueOnce({ saved_objects: [] });

      await taskRunner.run();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Active verifier policy'));
    });

    it('should complete when no connectors have installed packages', async () => {
      mockedAgentPolicyService.list
        .mockResolvedValueOnce({ items: [] } as any)
        .mockResolvedValueOnce({ items: [] } as any);

      mockSoClient.find.mockResolvedValue({ saved_objects: [] });

      await taskRunner.run();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('No connectors with installed packages found')
      );
    });

    it('should skip connector when not eligible', async () => {
      mockedAgentPolicyService.list
        .mockResolvedValueOnce({ items: [] } as any)
        .mockResolvedValueOnce({ items: [] } as any);

      mockSoClient.find
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'pp-1',
              attributes: {
                cloud_connector_id: 'conn-1',
                inputs: [{ enabled: true, policy_template: 'cloudtrail' }],
                package: { name: 'aws', title: 'AWS', version: '2.0.0' },
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'conn-1',
              attributes: {
                name: 'My Connector',
                cloudProvider: 'aws',
                vars: {},
                created_at: '2020-01-01T00:00:00Z',
                updated_at: '2020-01-01T00:00:00Z',
                verification_status: 'success',
                verification_started_at: new Date().toISOString(),
              },
            },
          ],
        });

      await taskRunner.run();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('not eligible'));
    });

    it('should verify eligible connector and update status on success', async () => {
      mockedAgentPolicyService.list
        .mockResolvedValueOnce({ items: [] } as any)
        .mockResolvedValueOnce({ items: [] } as any);

      mockedAgentPolicyService.createVerifierPolicy.mockResolvedValueOnce({
        policyId: 'verifier-policy-1',
      });

      mockSoClient.find
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'pp-1',
              attributes: {
                cloud_connector_id: 'conn-1',
                inputs: [{ enabled: true, policy_template: 'cloudtrail' }],
                package: { name: 'aws', title: 'AWS', version: '2.0.0' },
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'conn-1',
              attributes: {
                name: 'My Connector',
                cloudProvider: 'aws',
                vars: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
          ],
        });

      mockSoClient.update.mockResolvedValue({});

      await taskRunner.run();

      expect(mockedAgentPolicyService.createVerifierPolicy).toHaveBeenCalledWith(
        mockSoClient,
        mockEsClient,
        expect.objectContaining({ id: 'conn-1' }),
        expect.objectContaining({
          policyTemplates: ['cloudtrail'],
          packageName: 'aws',
          packageTitle: 'AWS',
          packageVersion: '2.0.0',
        })
      );

      expect(mockSoClient.update).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'conn-1',
        expect.objectContaining({
          verification_started_at: expect.any(String),
          verification_status: 'pending',
        })
      );
    });

    it('should mark connector as failed when createVerifierPolicy throws', async () => {
      mockedAgentPolicyService.list
        .mockResolvedValueOnce({ items: [] } as any)
        .mockResolvedValueOnce({ items: [] } as any);

      mockedAgentPolicyService.createVerifierPolicy.mockRejectedValueOnce(
        new Error('deployment failed')
      );

      mockSoClient.find
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'pp-1',
              attributes: {
                cloud_connector_id: 'conn-1',
                inputs: [{ enabled: true, policy_template: 'guardduty' }],
                package: { name: 'aws', title: 'AWS', version: '2.0.0' },
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'conn-1',
              attributes: {
                name: 'Failed Connector',
                cloudProvider: 'aws',
                vars: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
          ],
        });

      mockSoClient.update.mockResolvedValue({});

      await taskRunner.run();

      expect(mockSoClient.update).toHaveBeenCalledWith(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        'conn-1',
        expect.objectContaining({
          verification_status: 'failed',
          verification_failed_at: expect.any(String),
        })
      );
    });

    it('should aggregate multiple policy templates for the same connector', async () => {
      mockedAgentPolicyService.list
        .mockResolvedValueOnce({ items: [] } as any)
        .mockResolvedValueOnce({ items: [] } as any);

      mockedAgentPolicyService.createVerifierPolicy.mockResolvedValueOnce({
        policyId: 'verifier-policy-1',
      });

      mockSoClient.find
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'pp-1',
              attributes: {
                cloud_connector_id: 'conn-1',
                inputs: [{ enabled: true, policy_template: 'cloudtrail' }],
                package: { name: 'aws', title: 'AWS', version: '2.0.0' },
              },
            },
            {
              id: 'pp-2',
              attributes: {
                cloud_connector_id: 'conn-1',
                inputs: [{ enabled: true, policy_template: 'guardduty' }],
                package: { name: 'aws', title: 'AWS', version: '2.0.0' },
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'conn-1',
              attributes: {
                name: 'Multi Template Connector',
                cloudProvider: 'aws',
                vars: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
          ],
        });

      mockSoClient.update.mockResolvedValue({});

      await taskRunner.run();

      expect(mockedAgentPolicyService.createVerifierPolicy).toHaveBeenCalledWith(
        mockSoClient,
        mockEsClient,
        expect.anything(),
        expect.objectContaining({
          policyTemplates: ['cloudtrail', 'guardduty'],
        })
      );
    });

    it('should cleanup expired verifier policies', async () => {
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();

      mockedAgentPolicyService.list
        .mockResolvedValueOnce({
          items: [{ id: 'expired-verifier', created_at: sixMinutesAgo, updated_at: sixMinutesAgo }],
        } as any)
        .mockResolvedValueOnce({ items: [] } as any);

      mockedAgentPolicyService.deleteVerifierPolicy.mockResolvedValue();

      mockSoClient.find.mockResolvedValue({ saved_objects: [] });

      await taskRunner.run();

      expect(mockedAgentPolicyService.deleteVerifierPolicy).toHaveBeenCalledWith(
        mockSoClient,
        mockEsClient,
        'expired-verifier'
      );
    });

    it('should only verify one connector per task run (serial execution gate)', async () => {
      mockedAgentPolicyService.list
        .mockResolvedValueOnce({ items: [] } as any)
        .mockResolvedValueOnce({ items: [] } as any);

      mockedAgentPolicyService.createVerifierPolicy.mockResolvedValueOnce({
        policyId: 'verifier-policy-1',
      });

      mockSoClient.find
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'pp-1',
              attributes: {
                cloud_connector_id: 'conn-1',
                inputs: [{ enabled: true, policy_template: 'cloudtrail' }],
                package: { name: 'aws', title: 'AWS', version: '2.0.0' },
              },
            },
            {
              id: 'pp-2',
              attributes: {
                cloud_connector_id: 'conn-2',
                inputs: [{ enabled: true, policy_template: 'guardduty' }],
                package: { name: 'aws', title: 'AWS', version: '2.0.0' },
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'conn-1',
              attributes: {
                name: 'Connector One',
                cloudProvider: 'aws',
                vars: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
            {
              id: 'conn-2',
              attributes: {
                name: 'Connector Two',
                cloudProvider: 'aws',
                vars: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
          ],
        });

      mockSoClient.update.mockResolvedValue({});

      await taskRunner.run();

      expect(mockedAgentPolicyService.createVerifierPolicy).toHaveBeenCalledTimes(1);
      expect(mockedAgentPolicyService.createVerifierPolicy).toHaveBeenCalledWith(
        mockSoClient,
        mockEsClient,
        expect.objectContaining({ id: 'conn-1' }),
        expect.anything()
      );
    });

    it('should skip all verifications when a non-expired verifier deployment is in flight', async () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      mockedAgentPolicyService.list
        .mockResolvedValueOnce({ items: [] } as any)
        .mockResolvedValueOnce({
          items: [
            {
              id: 'in-flight-verifier',
              created_at: twoMinutesAgo,
              updated_at: twoMinutesAgo,
            },
          ],
        } as any);

      await taskRunner.run();

      expect(mockedAgentPolicyService.createVerifierPolicy).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Active verifier policy in-flight-verifier exists')
      );
    });

    it('should not retry a recently failed connector until the backoff window elapses', async () => {
      mockedAgentPolicyService.list
        .mockResolvedValueOnce({ items: [] } as any)
        .mockResolvedValueOnce({ items: [] } as any);

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

      mockSoClient.find
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'pp-1',
              attributes: {
                cloud_connector_id: 'conn-failed',
                inputs: [{ enabled: true, policy_template: 'cloudtrail' }],
                package: { name: 'aws', title: 'AWS', version: '2.0.0' },
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'conn-failed',
              attributes: {
                name: 'Failed Connector',
                cloudProvider: 'aws',
                vars: {},
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
                verification_status: 'failed',
                verification_started_at: twoMinutesAgo,
                verification_failed_at: twoMinutesAgo,
              },
            },
          ],
        });

      await taskRunner.run();

      expect(mockedAgentPolicyService.createVerifierPolicy).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('not eligible'));
    });
  });
});
