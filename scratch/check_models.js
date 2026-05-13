const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyDEBXOXVTC9Rh-oimUrXajPq0gyoOXZeN8");

async function listModels() {
  try {
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // This doesn't list, it just gets the handle
    // The SDK doesn't have a listModels method in the main class?
    // Actually it's not in the main GoogleGenerativeAI class.
  } catch (e) {
    console.error(e);
  }
}
listModels();
