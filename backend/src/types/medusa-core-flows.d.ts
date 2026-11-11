import "@medusajs/medusa/core-flows"

declare module "@medusajs/medusa/core-flows" {
  // Some core-flows JavaScript exports used by this project are missing declaration files.
  export const useQueryGraphStep: any
  export const updateStoresWorkflow: any
  export const updateProductsWorkflow: any
  export const updateInventoryLevelsWorkflow: any
}
