// Types for the plain-JS DOM extraction strategy next to this file.
import type { DomNode, InteractiveElementDomNode } from './type'

/** What the extraction returns: the flat tree plus the interactive nodes in document order. */
export interface PagenterStrategyResult {
	rootId: string
	map: Record<string, DomNode>
	interactiveNodes?: {
		nodeId: string
		nodeData: InteractiveElementDomNode
		node: HTMLElement
		parentIframe: HTMLIFrameElement | null
	}[]
}
declare const pagenterStrategy: (args?: {
	viewportExpansion?: number
	debugMode?: boolean
	interactiveBlacklist?: Element[]
	interactiveWhitelist?: Element[]
	extractionMode?: string
}) => PagenterStrategyResult
export default pagenterStrategy
