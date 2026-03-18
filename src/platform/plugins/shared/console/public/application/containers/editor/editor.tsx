/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, memo, useEffect, useState, useMemo, useRef } from 'react';

import { debounce } from 'lodash';
import {
  EuiProgress,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiResizableContainer,
  useIsWithinBreakpoints,
} from '@elastic/eui';

import { UnifiedTabs, type UnifiedTabsProps } from '@kbn/unified-tabs';
import type { ConsoleTourStepProps } from '../../components';

import type { TextObject } from '../../../../common/text_object';

import { NetworkRequestStatusBar } from '../../components';
import {
  useServicesContext,
  useRequestReadContext,
  useRequestActionContext,
  useEditorActionContext,
  useEditorReadContext,
} from '../../contexts';
import { OutputPanel } from './output_panel';
import { InputPanel } from './input_panel';
import { ImportExportRequestsButtons } from './import_export_requests_buttons';
import { getResponseWithMostSevereStatusCode } from '../../../lib/utils';
import { useStyles } from './editor_styles';
import { PanelStorage } from './panel_storage';
import { DEBOUNCE_DELAY } from '../../const';
import { editorI18n } from './editor_i18n';
import { useResizerButtonStyles } from '../styles';
import type { InputEditorValue } from './types';
import { instance as editorRegistry } from '../../contexts/editor_context/editor_registry';

const PANEL_MIN_SIZE = '20%';

interface Props {
  loading: boolean;
  inputEditorValue: string;
  setInputEditorValue: (value: string) => void;
  filesTourStepProps?: ConsoleTourStepProps;
}

export const Editor = memo(
  ({ loading, inputEditorValue, setInputEditorValue, filesTourStepProps }: Props) => {
    const {
      services: { objectStorageClient },
    } = useServicesContext();
    const styles = useStyles();
    const resizerStyles = useResizerButtonStyles();

    const panelStorage = useMemo(() => new PanelStorage(), []);
    const [firstPanelSize, secondPanelSize] = useMemo(
      () => panelStorage.getPanelSize(),
      [panelStorage]
    );

    // only used to hide content
    const { currentTextObject } = useEditorReadContext();

    const {
      requestInFlight,
      lastResult: { data: requestData, error: requestError },
    } = useRequestReadContext();

    // request related
    const dispatch = useRequestActionContext();
    // localStorage related
    const editorDispatch = useEditorActionContext();

    // const [selectedTabId, setSelectedTabId] = useState<EditorTabId>('request');
    const [{ managedItems, managedSelectedItemId }, setState] = useState<{
      managedItems: UnifiedTabsProps['items'];
      managedSelectedItemId: UnifiedTabsProps['selectedItemId'];
    }>({
      managedItems: [{ label: 'Untitled', id: '1' }],
      managedSelectedItemId: '1',
    });

    const [editorValueByTab, setEditorValueByTab] = useState<
      Record<string, { inputValue: InputEditorValue; outputValue: string }>
    >(() => ({
      '1': { inputValue: { text: inputEditorValue }, outputValue: '' },
    }));
    const [internalInputEditorValue, setInternalInputEditorValue] = useState<InputEditorValue>(
      () => ({
        text: inputEditorValue,
      })
    );

    // Refs to avoid races between keystrokes and tab switching.
    const editorValueByTabRef = useRef(editorValueByTab);
    const internalInputEditorValueRef = useRef(internalInputEditorValue);
    const managedSelectedItemIdRef = useRef(managedSelectedItemId);

    editorValueByTabRef.current = editorValueByTab;
    internalInputEditorValueRef.current = internalInputEditorValue;
    managedSelectedItemIdRef.current = managedSelectedItemId;

    // used for showing a loading state when fetching autocomplete entities
    const [fetchingAutocompleteEntities, setFetchingAutocompleteEntities] = useState(false);

    const isVerticalLayout = useIsWithinBreakpoints(['xs', 's', 'm']);

    // note that the currentTextObject isn't updated, but its ok
    // because its really just providing a createdAt date
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    const debouncedUpdateLocalStorageValue = useCallback(
      debounce((newValue: string | undefined) => {
        const textObject = {
          ...currentTextObject,
          text: newValue,
          updatedAt: Date.now(),
        } as TextObject;

        objectStorageClient.text.update(textObject);

        editorDispatch({
          type: 'setCurrentTextObject',
          payload: textObject,
        });
      }, DEBOUNCE_DELAY),
      []
    );

    // Always keep the localstorage value in sync with the value in the editor
    // to avoid losing the text object when the user navigates away from the shell
    useEffect(() => {
      debouncedUpdateLocalStorageValue(internalInputEditorValue.text);
    }, [debouncedUpdateLocalStorageValue, internalInputEditorValue.text]);

    const updateInputEditorValue = useCallback(
      (nextValue: InputEditorValue) => {
        const selectedId = managedSelectedItemIdRef.current;
        if (!selectedId) return;

        internalInputEditorValueRef.current = nextValue;
        setEditorValueByTab((prev) => ({
          ...prev,
          [selectedId]: {
            inputValue: nextValue,
            outputValue: prev[selectedId]?.outputValue || '',
          },
        }));
        setInternalInputEditorValue(nextValue);
      },
      [setEditorValueByTab, setInternalInputEditorValue]
    );

    useEffect(() => {
      setInputEditorValue(internalInputEditorValue.text);
    }, [internalInputEditorValue.text, setInputEditorValue]);

    const updateOutputEditorValue = useCallback((nextValue: string) => {
      const selectedId = managedSelectedItemIdRef.current;
      if (!selectedId) return;

      setEditorValueByTab((prev) => ({
        ...prev,
        [selectedId]: {
          inputValue: prev[selectedId]?.inputValue ?? { text: '' },
          outputValue: nextValue,
        },
      }));
    }, []);

    if (!currentTextObject) return null;

    const data = getResponseWithMostSevereStatusCode(requestData) ?? requestError;
    const isLoading = loading || requestInFlight;
    // todo seems this should be one of these
    const exportContent =
      editorRegistry.getInputModel()?.getValue() ?? internalInputEditorValue.text;

    return (
      <>
        <UnifiedTabs
          items={managedItems}
          selectedItemId={managedSelectedItemId}
          recentlyClosedItems={[]}
          services={{ core: {} }}
          createItem={() => ({
            id: `${Date.now()}`,
            label: editorI18n.newTabLabel,
          })}
          onClearRecentlyClosed={() => {}}
          onEBTEvent={() => {}}
          onChanged={(nextState) => {
            const nextSelectedTabId = nextState.selectedItem?.id;

            const nextTabIds = new Set(nextState.items.map((item) => item.id));

            const nextEditorValueByTab: Record<
              string,
              { inputValue: InputEditorValue; outputValue: string }
            > = {};

            const prevEditorValueByTab = editorValueByTabRef.current;
            const prevSelectedTabId = managedSelectedItemIdRef.current;
            const prevInternalValue = internalInputEditorValueRef.current;
            const liveViewState = editorRegistry.getEditor()?.saveViewState();
            const prevInternalValueWithLiveViewState: InputEditorValue = liveViewState
              ? { ...prevInternalValue, viewState: liveViewState }
              : prevInternalValue;

            // Carry over only tabs that still exist
            for (const tabId of Object.keys(prevEditorValueByTab)) {
              if (!nextTabIds.has(tabId)) continue;
              nextEditorValueByTab[tabId] = prevEditorValueByTab[tabId];
            }

            // Persist the latest state of the previously selected tab (in case tab switching happens
            // before a React state update flushes).
            if (prevSelectedTabId && nextTabIds.has(prevSelectedTabId)) {
              nextEditorValueByTab[prevSelectedTabId] = {
                inputValue: prevInternalValueWithLiveViewState,
                outputValue: nextEditorValueByTab[prevSelectedTabId]?.outputValue ?? '',
              };
            }

            // Initialize state for newly created tabs.
            for (const tabId of nextTabIds) {
              if (!nextEditorValueByTab[tabId]) {
                nextEditorValueByTab[tabId] = {
                  inputValue: { text: '' },
                  outputValue: '',
                };
              }
            }

            setState({
              managedItems: nextState.items,
              managedSelectedItemId: nextSelectedTabId,
            });

            setEditorValueByTab(nextEditorValueByTab);
            editorValueByTabRef.current = nextEditorValueByTab;
            managedSelectedItemIdRef.current = nextSelectedTabId;

            if (nextSelectedTabId) {
              const nextValue = nextEditorValueByTab[nextSelectedTabId]?.inputValue ?? {
                text: '',
              };
              internalInputEditorValueRef.current = nextValue;
              setInternalInputEditorValue(nextValue);
            } else {
              internalInputEditorValueRef.current = { text: '' };
              setInternalInputEditorValue({ text: '' });
            }
          }}
          data-test-subj="consoleEditorTabs"
        />
        {fetchingAutocompleteEntities ? (
          <div css={styles.requestProgressBarContainer}>
            <EuiProgress size="xs" color="accent" position="absolute" />
          </div>
        ) : null}
        <EuiResizableContainer
          css={styles.resizeableContainer}
          direction={isVerticalLayout ? 'vertical' : 'horizontal'}
          onPanelWidthChange={(sizes) =>
            panelStorage.setPanelSize(sizes as { inputPanel: number; outputPanel: number })
          }
          data-test-subj="consoleEditorContainer"
        >
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel
                initialSize={firstPanelSize}
                minSize={PANEL_MIN_SIZE}
                tabIndex={0}
                paddingSize="none"
                id="inputPanel"
              >
                <EuiSplitPanel.Outer
                  grow={true}
                  borderRadius="none"
                  hasShadow={false}
                  css={styles.fullHeightPanel}
                >
                  <EuiSplitPanel.Inner
                    paddingSize="none"
                    grow={true}
                    css={[styles.consoleEditorPanel, styles.editorPanelPositioned]}
                  >
                    <InputPanel
                      loading={loading}
                      activeTabId={managedSelectedItemId}
                      inputEditorValue={internalInputEditorValue}
                      setInputEditorValue={updateInputEditorValue}
                      setFetchingAutocompleteEntities={setFetchingAutocompleteEntities}
                    />
                  </EuiSplitPanel.Inner>

                  {!loading && (
                    <EuiSplitPanel.Inner
                      grow={false}
                      paddingSize="s"
                      color="subdued"
                      css={styles.consoleEditorPanel}
                    >
                      <EuiFlexGroup
                        responsive={false}
                        gutterSize="s"
                        justifyContent="spaceBetween"
                        alignItems="center"
                      >
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            size="xs"
                            color="primary"
                            data-test-subj="clearConsoleInput"
                            onClick={() => {
                              updateInputEditorValue({ text: '' });
                            }}
                          >
                            {editorI18n.clearConsoleInputButton}
                          </EuiButtonEmpty>
                        </EuiFlexItem>

                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup responsive={false} gutterSize="s" justifyContent="flexEnd">
                            <EuiFlexItem grow={false}>
                              <ImportExportRequestsButtons
                                exportContent={exportContent}
                                tourStepProps={filesTourStepProps}
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiSplitPanel.Inner>
                  )}
                </EuiSplitPanel.Outer>
              </EuiResizablePanel>

              <EuiResizableButton
                css={resizerStyles}
                aria-label={
                  isVerticalLayout
                    ? editorI18n.adjustPanelSizeVertical
                    : editorI18n.adjustPanelSizeHorizontal
                }
              />

              <EuiResizablePanel
                initialSize={secondPanelSize}
                minSize={PANEL_MIN_SIZE}
                tabIndex={0}
                paddingSize="none"
                id="outputPanel"
              >
                <EuiSplitPanel.Outer
                  borderRadius="none"
                  hasShadow={false}
                  css={styles.fullHeightPanel}
                >
                  <EuiSplitPanel.Inner
                    paddingSize="none"
                    css={[styles.consoleEditorPanel, styles.outputPanelCentered]}
                  >
                    <OutputPanel
                      loading={isLoading}
                      setVal={updateOutputEditorValue}
                      val={editorValueByTab[managedSelectedItemId!]?.outputValue || ''}
                    />
                  </EuiSplitPanel.Inner>

                  {(data || isLoading) && (
                    <EuiSplitPanel.Inner
                      grow={false}
                      paddingSize="s"
                      css={[styles.consoleEditorPanel, styles.actionsPanelWithBackground]}
                    >
                      <EuiFlexGroup gutterSize="none" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            size="xs"
                            color="primary"
                            data-test-subj="clearConsoleOutput"
                            onClick={() => dispatch({ type: 'cleanRequest', payload: undefined })}
                          >
                            {editorI18n.clearConsoleOutputButton}
                          </EuiButtonEmpty>
                        </EuiFlexItem>

                        <EuiFlexItem>
                          <NetworkRequestStatusBar />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiSplitPanel.Inner>
                  )}
                </EuiSplitPanel.Outer>
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </>
    );
  }
);
