// TODO(types)
// Types for the plain-JS DOM extraction strategy next to this file.
declare const pagenterStrategy: (args?: {
	viewportExpansion?: number
	debugMode?: boolean
	interactiveBlacklist?: Element[]
	interactiveWhitelist?: Element[]
	extractionMode?: string
}) => any
export default pagenterStrategy
