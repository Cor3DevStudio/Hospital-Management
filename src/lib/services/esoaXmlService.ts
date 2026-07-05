export {
  buildPhilHealthXmlFile as buildEsoaXmlFile,
  findPhilHealthXmlAttachments as findEsoaAttachments,
  PHILHEALTH_XML_FILENAMES,
  validatePhilHealthXml as validateEsoaForEclaim,
  type PhilHealthXmlValidationResult as EsoaValidationResult,
} from "@/lib/services/philhealthXmlService";

export const ESOA_XML_FILENAME = "ESOA.xml";
