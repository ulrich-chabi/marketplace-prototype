import { MedusaService } from "@medusajs/framework/utils"
import Vendor from "./models/vendor"
import VendorAdmin from "./models/vendor-admin"
import VendorRefund from "./models/vendor-refund"
import ReturnRequest from "./models/return-request"

class MarketplaceModuleService extends MedusaService({
  Vendor,
  VendorAdmin,
  VendorRefund,
  ReturnRequest,
}) {}

export default MarketplaceModuleService
