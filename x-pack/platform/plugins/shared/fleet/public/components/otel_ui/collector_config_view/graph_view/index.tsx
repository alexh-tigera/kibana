/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  type NodeTypes,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { OTelCollectorConfig } from '../../../../../common/types';

import { configToGraph } from './config_to_graph';

import { ComponentNode } from './component_node';
import { PipelineGroupNode } from './pipeline_group_node';
import { applyDagreLayout } from './layout';

const nodeTypes: NodeTypes = {
  component: ComponentNode,
  pipelineGroup: PipelineGroupNode,
};

interface GraphViewProps {
  config: OTelCollectorConfig;
  selectedPipelineId: string;
}

const GraphViewInner: React.FunctionComponent<GraphViewProps> = ({
  config,
  selectedPipelineId,
}) => {
  const { euiTheme } = useEuiTheme();
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    const graph = configToGraph(config, selectedPipelineId);
    const layoutNodes = applyDagreLayout(graph.nodes, graph.edges);
    return { nodes: layoutNodes, edges: graph.edges };
  }, [config, selectedPipelineId]);

  useEffect(() => {
    fitView({ padding: 0.1 });
  }, [fitView, nodes, edges]);

  const defaultEdgeOptions = useMemo(
    () => ({
      style: { stroke: euiTheme.colors.mediumShade, strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: euiTheme.colors.mediumShade,
      },
    }),
    [euiTheme]
  );

  const containerStyles = css`
    width: 100%;
    height: 500px;
    border: 1px solid ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
  `;

  return (
    <div css={containerStyles}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

export const GraphView: React.FunctionComponent<GraphViewProps> = (props) => {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
};
