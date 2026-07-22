// Gemini AI Integration - Enhanced with retry logic and better error handling
let lastQuery = "";
let retryCount = 0;
const MAX_RETRIES = 3;
const API_KEY = "Add you ownkey here";
const API_URL = `${API_KEY}`;

async function askGemini(isRetry = false) {
  const prompt = document.getElementById("geminiPrompt").value;
  const responseElement = document.getElementById("geminiResponse");
  const button = document.querySelector('.gemini-button');
  const retryButton = document.getElementById('retryButton');

  if (!isRetry) {
    lastQuery = prompt;
    retryCount = 0;
  }

  if (!lastQuery.trim()) {
    responseElement.textContent = "❗ Please enter a question.";
    responseElement.style.backgroundColor = "#fff3cd";
    responseElement.style.color = "#856404";
    retryButton.style.display = "none";
    return;
  }

  // Disable buttons and show loading state
  button.disabled = true;
  button.textContent = retryCount > 0 ? `Retrying... (${retryCount + 1}/${MAX_RETRIES})` : "Thinking...";
  retryButton.style.display = "none";
  
  responseElement.textContent = "🤔 AI is thinking about your question...";
  responseElement.style.backgroundColor = "#e7f3ff";
  responseElement.style.color = "#0056b3";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a helpful AI assistant for a campus Lost and Found system. Please provide practical, helpful advice about the following question: ${lastQuery}

Guidelines for your response:
- Be specific and actionable
- Relate to campus lost and found scenarios when possible
- Keep responses concise but comprehensive (2-4 paragraphs)
- Be encouraging and supportive
- If it's about lost items, provide step-by-step advice
- Always provide a complete response`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
          candidateCount: 1,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    clearTimeout(timeoutId);
    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Full API response:", data);

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      
      // Check if response was blocked for safety reasons
      if (candidate.finishReason === "SAFETY") {
        responseElement.textContent = "🛡️ Sorry, I can't provide a response to that question for safety reasons. Please try rephrasing your question about lost and found procedures.";
        responseElement.style.backgroundColor = "#fff3cd";
        responseElement.style.color = "#856404";
        return;
      }

      // Check for incomplete responses
      if (candidate.finishReason === "MAX_TOKENS" || candidate.finishReason === "LENGTH") {
        responseElement.textContent = "⚠️ Response was too long and got cut off. Please ask a more specific question.";
        responseElement.style.backgroundColor = "#fff3cd";
        responseElement.style.color = "#856404";
        retryButton.style.display = "inline-block";
        return;
      }
      
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const reply = candidate.content.parts[0].text;
        
        // Check if response is complete (has meaningful content)
        if (reply && reply.length > 20) {
          responseElement.textContent = `💡 ${reply}`;
          responseElement.style.backgroundColor = "#d4edda";
          responseElement.style.color = "#155724";
          retryCount = 0; // Reset retry count on success
        } else {
          throw new Error("Incomplete response received");
        }
      } else {
        throw new Error("No content in response");
      }
    } else {
      throw new Error("No candidates returned from API");
    }
    
  } catch (error) {
    console.error("Error:", error);
    
    // Handle timeout
    if (error.name === 'AbortError') {
      responseElement.textContent = "⏱️ Request timed out. Please try again.";
    } else if (retryCount < MAX_RETRIES - 1) {
      // Automatically retry for certain errors
      retryCount++;
      setTimeout(() => askGemini(true), 2000); // Wait 2 seconds before retry
      return;
    } else {
      // Show error message with retry option
      responseElement.textContent = `🌐 Connection Error: ${error.message}. Please check your internet connection.`;
      retryButton.style.display = "inline-block";
    }
    
    responseElement.style.backgroundColor = "#f8d7da";
    responseElement.style.color = "#721c24";
    
  } finally {
    // Re-enable button
    button.disabled = false;
    button.textContent = "Ask AI Assistant";
  }
}

function retryLastQuery() {
  if (lastQuery) {
    retryCount = 0;
    askGemini(true);
  }
}

// Make functions globally available
window.askGemini = askGemini;
window.retryLastQuery = retryLastQuery;
