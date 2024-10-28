import React, { useState } from 'react';
import './App.css';

// New ServiceDisplay component
const ServiceDisplay = ({ services }) => {
  return (
    <div className="service-display">
      <h3>This user wants:</h3>
      <p>{services.join(', ')}</p>
    </div>
  );
};

// New JsonDisplay component
const JsonDisplay = ({ json }) => {
  return (
    <div className="json-display">
      <h3>Service Details:</h3>
      <pre>{JSON.stringify(json, null, 2)}</pre>
    </div>
  );
};

function App() {
  const [userResponse, setUserResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [finalSubgenre, setFinalSubgenre] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationContext] = useState('');
  const [finalJson, setFinalJson] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [promptTokens, setPromptTokens] = useState(0);
  const [completionTokens, setCompletionTokens] = useState(0);
  const [audioCharacters, setAudioCharacters] = useState(0);
  const [speechTimeout, setSpeechTimeout] = useState(null);

  // Constants for pricing (as of March 2024)
  const PRICES = {
    'gpt-4': 0.03 / 1000,   // $0.03 per 1K tokens for GPT-4 input
    'gpt-4-output': 0.06 / 1000,   // $0.06 per 1K tokens for GPT-4 output
    'tts-1': 0.015 / 1000,  // $0.015 per 1K characters
  };

  // Add token counting function
  const calculateTokenCost = () => {
    const inputCost = (promptTokens * PRICES['gpt-4']).toFixed(4);
    const outputCost = (completionTokens * PRICES['gpt-4-output']).toFixed(4);
    const audioCost = (audioCharacters * PRICES['tts-1']).toFixed(4);
    const totalCost = (parseFloat(inputCost) + parseFloat(outputCost) + parseFloat(audioCost)).toFixed(4);
    return { inputCost, outputCost, audioCost, totalCost };
  };

  // Define categories and subcategories with blank descriptions
  const categories = {
    housing: {
      active: true,
      description: "Provides beds for various groups of people. Must make sure the user qualifies before finalizing. ", // Updated description
      subcategories: [
        {
          name: "shelter for men",
          description: "Ask if user is a man" // Updated description
        },
        {
          name: "shelter for women",
          description: "Ask if user is a women" // Updated description
        },
        {
          name: "shelter for families",
          description: "Ask if user has children" // Updated description
        },
        {
          name: "shelter and recovery for men with addictions",
          description: "make sure they are men with addictions" // Updated description
        },
        {
          name: "shelter and recovery for women with addictions",
          description: "make sure they are women with addictions" // Updated description
        },
        {
          name: "long term housing for teens",
          description: "ask if they are between age 16-22." // Updated description
        }
      ]
    },
    food: {
      active: true,
      description: "", // Blank description
      subcategories: [
        {
          name: "cooked food",
          description: "" // Blank description
        },
        {
          name: "groceries",
          description: "" // Blank description
        }
      ]
    },
    medical: {
      active: true,
      description: "", // Blank description
      subcategories: [
        {
          name: "general",
          description: "" // Blank description
        },
        {
          name: "women medical",
          description: "" // Blank description
        }
      ]
    },
    hygiene: {
      active: true,
      description: "", // Blank description
      subcategories: [
        {
          name: "showers",
          description: "" // Blank description
        },
        {
          name: "sanitation kits",
          description: "" // Blank description
        }
      ]
    },
    clothes: {
      active: true,
      description: "", // Blank description
      subcategories: [
        {
          name: "men's clothes",
          description: "" // Blank description
        },
        {
          name: "women's clothes",
          description: "" // Blank description
        },
        {
          name: "children's clothes",
          description: "" // Blank description
        },
        {
          name: "winter clothes",
          description: "like socks, jackets, pants general warming clothes." // Blank description
        }
      ]
    },
    jobsandtraining: {
      active: false, // Example of an inactive category
      description: "", // Blank description
      subcategories: [
        { name: "resume help", description: "" }, 
        { name: "training", description: "" }, 
        { name: "job applications", description: "" }
      ]
    },
    otherservices: {
      active: false, // Example of an inactive category
      description: "", // Blank description
      subcategories: [
        { name: "Addiction", description: "" }, 
        { name: "Bus Fare", description: "" }, 
        { name: "Car Repair", description: "" }, 
        { name: "Day Care", description: "" }, 
        { name: "Diapers", description: "" }, 
        { name: "Furniture", description: "" }, 
        { name: "Hair Services", description: "" }, 
        { name: "High School Diploma or Homework Help", description: "" }, 
        { name: "I.D Cards or Social Security Cards", description: "" }, 
        { name: "Legal", description: "" }, 
        { name: "Mental Health", description: "" }, 
        { name: "Phone", description: "" }, 
        { name: "SNAP Benefits", description: "" }, 
        { name: "Shower and Toiletries", description: "" }, 
        { name: "Utilities", description: "" }, 
        { name: "Veteran Assistance", description: "" }, 
        { name: "Wash Clothes", description: "" }
      ]
    }
  };

  // Modified generateSpeech with better timing control
  const generateSpeech = async (text, shouldAutoRecord = true) => {
    if (!text.trim()) return;
    
    try {
      // Clear any existing timeout
      if (speechTimeout) {
        clearTimeout(speechTimeout);
        setSpeechTimeout(null);
      }
      
      // Ensure recording is stopped
      setIsRecording(false);
      
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'alloy',
          speed: 1.0,
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        throw new Error('Speech generation failed');
      }

      const characterCount = parseInt(response.headers.get('x-characters-used') || text.length);
      setAudioCharacters(prev => prev + characterCount);

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve) => {
        let playbackComplete = false;

        audio.onplay = () => {
          setIsSpeaking(true);
          // Stop any ongoing recognition when speech starts
          if (window.recognition) {
            window.recognition.abort();
          }
        };
        
        audio.onended = () => {
          playbackComplete = true;
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          
          // Only start listening if we should auto-record and haven't received final JSON
          if (shouldAutoRecord && !finalJson) {
            // Wait until speech is completely finished and state is updated
            setTimeout(() => {
              if (!finalJson && !isSpeaking && playbackComplete) {
                startVoiceRecognition();
              }
            }, 1000);
          }
          resolve();
        };

        audio.play().catch(error => {
          console.error('Error playing audio:', error);
          setIsSpeaking(false);
          playbackComplete = true;
          resolve();
        });
      });
    } catch (error) {
      console.error('Error generating speech:', error);
      setIsSpeaking(false);
    }
  };

  // Modified handleTextStream to prevent overlapping speech and recognition
  const handleTextStream = async (reader, decoder) => {
    try {
      let currentMessage = '';
      let sentenceBuffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              // Track usage if available
              if (parsed.usage) {
                setPromptTokens(prev => prev + parsed.usage.prompt_tokens);
                setCompletionTokens(prev => prev + parsed.usage.completion_tokens);
              }

              const content = parsed.choices[0]?.delta?.content || '';
              currentMessage += content;
              sentenceBuffer += content;
              
              // Check for JSON response first
              const jsonMatch = currentMessage.match(/{\s*"Category":\s*"(.*?)",\s*"Subcategory":\s*"(.*?)"\s*}/);
              if (jsonMatch) {
                const jsonResponse = {
                  Category: jsonMatch[1],
                  Subcategory: jsonMatch[2]
                };
                setFinalJson(jsonResponse);
                setFinalSubgenre([jsonResponse.Subcategory]);
                // Speak remaining text before JSON, but don't start recording after
                if (sentenceBuffer.trim()) {
                  await generateSpeech(sentenceBuffer, false); // Add parameter to prevent auto-recording
                }
                return;
              }

              // Update streaming text
              setStreamingText(currentMessage);

              // Only speak when we have complete sentences or enough content
              const hasSentenceEnd = /[.!?]\s*$/.test(sentenceBuffer);
              const hasEnoughContent = sentenceBuffer.length > 50;
              
              if (hasSentenceEnd || hasEnoughContent) {
                await generateSpeech(sentenceBuffer, true); // Add parameter to enable auto-recording
                sentenceBuffer = '';
              }

            } catch (error) {
              console.error('Error parsing streaming response:', error);
            }
          }
        }
      }
      
      // Speak any remaining text in buffer
      if (sentenceBuffer.trim()) {
        await generateSpeech(sentenceBuffer, true);
      }
    } catch (error) {
      console.error('Error in text stream:', error);
    }
  };

  // Modified askOpenAI function to use streaming
  const askOpenAI = async (response) => {
    setLoading(true);
    try {
      const categoryDetails = Object.entries(categories)
        .map(([category, { active, description, subcategories }]) => {
          const subcategoryDetails = subcategories.map(sub => `${sub.name} - ${sub.description}`).join(', ');
          return `${category} (Active: ${active ? 'Yes' : 'No'}): ${description}. Subcategories: ${subcategoryDetails}`;
        })
        .join('\n');

      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'user',
              content: `You are an assistant designed to help people find the services they need. Here is the conversation context: "${conversationContext}". Current user response: "${response}". Your responses are spoken, so keep them short, about 12 words. Don't give the user options at the start of the conversation. Based on the user's responses, determine the categories and subcategories from the following options:\n${categoryDetails}\n 
              If the user's input is unclear or could apply to multiple subcategories, ask clarifying questions to understand which subcategory they are looking for. For example, if the user mentions housing, confirm if they have children for family housing, or ask questions to figure out if they need to go to men's shelters or women's shelters. Ask just enough questions to get enough context to be certain that the option you select is right for them.
              If what they are looking for is not in the list, let them know that option isn't available, and try to help them find something else.
              Once you are sure of the category and subcategory without any assumtions, output the value in the following Json format: 
              {
                Category: [Category],
                Subcategory: [Subcategory]
              }
              This format clearly indicates the category and subcategory for each service. It will also stop the conversation and show the user the results based on the json. Feel free to stop the conversation after first request. For Example: If they say they are looking for a shelter for men, there is no need to ask them a follow up question.
              
              For streaming responses: Pause briefly at the end of each sentence to allow for natural speech rhythm. If you need to ask a clarifying question, make it a single, clear question. When providing the final JSON response, output it as a complete block without pauses.`
            }
          ],
          stream: true,
          max_tokens: 150
        })
      });

      if (!apiResponse.ok) {
        throw new Error(`HTTP error! status: ${apiResponse.status}`);
      }

      const reader = apiResponse.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      // Start streaming the response
      await handleTextStream(reader, decoder);
    } catch (error) {
      console.error('Error fetching from OpenAI:', error);
      setStreamingText('Sorry, there was an error processing your request.');
      await generateSpeech('Sorry, there was an error processing your request.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserResponse = (response) => {
    setUserResponse(response);
    askOpenAI(response); // Pass the user response to OpenAI
  };

  // Modified startVoiceRecognition to store recognition instance
  const startVoiceRecognition = () => {
    if (isRecording || isSpeaking || finalJson) {
      console.log('Skipping voice recognition start:', { isRecording, isSpeaking, hasFinalJson: !!finalJson });
      return;
    }
    
    console.log('Starting voice recognition...');
    setIsRecording(true);
    
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    window.recognition = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    
    let silenceTimer = null;
    let hasSpeechStarted = false;
    let finalTranscript = '';
    let lastSpeechTime = Date.now();

    recognition.onstart = () => {
      console.log('Recognition started');
      setUserResponse('');
      finalTranscript = '';
    };

    recognition.onspeechstart = () => {
      console.log('Speech started');
      hasSpeechStarted = true;
      lastSpeechTime = Date.now();
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    recognition.onresult = (event) => {
      lastSpeechTime = Date.now(); // Update last speech time with each result
      let interimTranscript = '';
      
      // Build the interim transcript from all results
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Update the UI with both final and interim results
      setUserResponse(finalTranscript + interimTranscript);
      
      // Reset silence timer
      if (silenceTimer) clearTimeout(silenceTimer);
      
      silenceTimer = setTimeout(() => {
        const silenceDuration = Date.now() - lastSpeechTime;
        
        // Only stop if we've had 2 seconds of silence after speech started
        if (hasSpeechStarted && silenceDuration >= 2000) {
          console.log('Silence detected, stopping recognition');
          recognition.stop();
          handleUserResponse(finalTranscript);
        }
      }, 2000); // Check every 2 seconds
    };

    // Add speech end detection
    recognition.onspeechend = () => {
      console.log('Speech ended');
      lastSpeechTime = Date.now();
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (silenceTimer) clearTimeout(silenceTimer);
    };
    
    recognition.onend = () => {
      console.log('Recognition ended');
      setIsRecording(false);
      if (silenceTimer) clearTimeout(silenceTimer);
      window.recognition = null; // Clear the reference
    };
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsRecording(false);
      window.recognition = null;
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleUserResponse(userResponse); // Submit the response on Enter key press
    }
  };

  // Add Usage Display component
  const UsageDisplay = () => {
    const costs = calculateTokenCost();
    return (
      <div className="usage-display" style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px'
      }}>
        <h4 style={{ margin: '0 0 5px 0' }}>Usage Metrics</h4>
        <div>Prompt Tokens: {promptTokens}</div>
        <div>Completion Tokens: {completionTokens}</div>
        <div>Audio Characters: {audioCharacters}</div>
        <div style={{ borderTop: '1px solid #666', marginTop: '5px', paddingTop: '5px' }}>
          <div>Prompt Cost: ${costs.inputCost}</div>
          <div>Completion Cost: ${costs.outputCost}</div>
          <div>Audio Cost: ${costs.audioCost}</div>
          <div style={{ fontWeight: 'bold', marginTop: '5px' }}>
            Total Cost: ${costs.totalCost}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <UsageDisplay />
      <div className="input-container">
        <input
          type="text"
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your question here..."
          className="search-input"
        />
        <button 
          onClick={startVoiceRecognition} 
          className="speak-button" 
          disabled={loading || isSpeaking}
        >
          {isRecording ? 'Listening...' : '🎤'}
        </button>
      </div>
      {loading && <p>Processing...</p>}
      {streamingText && !finalJson && (
        <div className="streaming-response">
          <p>{streamingText}</p>
        </div>
      )}
      {finalJson && (
        <>
          <ServiceDisplay services={finalSubgenre} />
          <JsonDisplay json={finalJson} />
        </>
      )}
    </div>
  );
}

export default App;
