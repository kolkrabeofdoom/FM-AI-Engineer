const API_KEY = "AIzaSyDEBXOXVTC9Rh-oimUrXajPq0gyoOXZeN8";
const MODEL = "gemini-pro";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

async function test() {
  try {
    const resp = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
    });
    const data = await resp.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
