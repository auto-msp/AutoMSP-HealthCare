import "server-only";
import { FREE_MODELS, aiGatewayModel, scriptedModel } from "@automsp/gateway";

/** Live free model when a gateway key is set, otherwise the offline scripted demo model. */
export function activeModel() {
  return process.env.AI_GATEWAY_API_KEY
    ? aiGatewayModel(process.env.GATEWAY_MODEL || FREE_MODELS[0])
    : scriptedModel();
}
