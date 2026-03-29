import type { NodeTypes } from '@xyflow/react'
import CustomNode from './CustomNode'
import StructuralNodeComponent from './StructuralNodeComponent'

export const nodeTypes: NodeTypes = {
  custom:     CustomNode,
  structural: StructuralNodeComponent,
}
