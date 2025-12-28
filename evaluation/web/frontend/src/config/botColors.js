/**
 * Bot name to color mapping for the Race Dashboard
 * Uses a gaming-inspired neon color palette
 */

const BOT_COLORS = {
  // MCTS variants
  'mcts': '#a855f7',           // purple
  'mcts-200': '#a855f7',
  'mcts-300': '#a855f7',
  
  // Backtrack variants
  'bt3': '#06b6d4',            // cyan
  'bt4': '#06b6d4',
  'bt5': '#06b6d4',
  'bts3': '#06b6d4',
  'bts4': '#06b6d4',
  'bts5': '#06b6d4',
  
  // RCoT variants (green)
  'rcot': '#10b981',           // green
  'rcot-gpt41': '#10b981',
  'rcot-openrouter-auto': '#10b981',
  'rcot-claude': '#10b981',
  'rcot-gemini': '#10b981',
  'rcot-llama-free': '#10b981',
  'rcot-qwen-free': '#10b981',
  'rcot-nemotron-free': '#10b981',
  'rcot-gpt-oss-free': '#10b981',
  'rcot-deepseek-free': '#10b981',
  
  // CoT variants (yellow)
  'cot': '#f59e0b',            // yellow/amber
  'cot-gpt41': '#f59e0b',
  'cot-openrouter-auto': '#f59e0b',
  'cot-claude': '#f59e0b',
  'cot-gemini': '#f59e0b',
  'cot-llama-free': '#f59e0b',
  'cot-qwen-free': '#f59e0b',
  'cot-nemotron-free': '#f59e0b',
  'cot-gpt-oss-free': '#f59e0b',
  'cot-deepseek-free': '#f59e0b',
  
  // None variants (pink)
  'none': '#ec4899',           // pink
  'none-gpt41': '#ec4899',
  'none-openrouter-auto': '#ec4899',
  'none-claude': '#ec4899',
  'none-gemini': '#ec4899',
  'none-llama-free': '#ec4899',
  'none-qwen-free': '#ec4899',
  'none-nemotron-free': '#ec4899',
  'none-gpt-oss-free': '#ec4899',
  'none-deepseek-free': '#ec4899',
  
  // Random and basic
  'rndm': '#8b5cf6',           // purple (variant)
  'r': '#8b5cf6',
  'basic': '#8b5cf6',
  'random': '#8b5cf6',
  
  // Legacy
  'legacy-gpt-t3.5-cot': '#6b7280',   // gray
  'legacy-gpt-t4-cot': '#6b7280',
}

/**
 * Get color for a bot name
 * Returns purple as fallback if bot name not found
 */
export const getBotColor = (botName) => {
  return BOT_COLORS[botName] || '#a855f7'
}

/**
 * Get lighter version of bot color for hover/background states
 */
export const getLightBotColor = (botName) => {
  const color = getBotColor(botName)
  // Simple approach: increase opacity or use CSS filter
  return color
}

/**
 * Get all unique bot colors (for legend, etc.)
 */
export const getUniqueBotColors = (botNames) => {
  const colors = {}
  botNames.forEach(name => {
    colors[name] = getBotColor(name)
  })
  return colors
}

export default BOT_COLORS
