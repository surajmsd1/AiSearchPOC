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
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [finalSubgenre, setFinalSubgenre] = useState([]); // This will hold the final subgenre
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationContext, setConversationContext] = useState('');
  const [finalJson, setFinalJson] = useState(null);

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
      description: "only need to differentiate between cooked food and groceries", // Blank description
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
      active: true, // Example of an inactive category
      description: "", // Blank description
      subcategories: [
        { name: "resume help", description: "" }, 
        { name: "training", description: "" }, 
        { name: "job applications", description: "" }
      ]
    },
    otherservices: {
      active: true, // Example of an inactive category
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

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true); // Set speaking state to true
    utterance.onend = () => setIsSpeaking(false); // Reset speaking state when done
    window.speechSynthesis.speak(utterance);
  };

  const askOpenAI = async (response) => {
    setLoading(true);
    try {
      // Create a string of categories and their subcategories with descriptions
      const categoryDetails = Object.entries(categories)
        .map(([category, { active, description, subcategories }]) => {
          const subcategoryDetails = subcategories.map(sub => `${sub.name} - ${sub.description}`).join(', ');
          return `${category} (Active: ${active ? 'Yes' : 'No'}): ${description}. Subcategories: ${subcategoryDetails}`;
        })
        .join('\n');

      // Print the categoryDetails string to the console
      console.log(categoryDetails);

      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}` // Use env variable for security
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // or any other model you prefer
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
              This format clearly indicates the category and subcategory for each service. It will also stop the conversation and show the user the results based on the json. Feel free to stop the conversation after first request. For Example: If they say they are looking for a shelter for men, there is no need to ask them a follow up question.`
            }
          ]
        })
      });

      const data = await apiResponse.json();
      const nextQuestion = data.choices[0].message.content;

      // Check if the response contains JSON
      const jsonMatch = nextQuestion.match(/{\s*"Category":\s*"(.*?)",\s*"Subcategory":\s*"(.*?)"\s*}/);
      if (jsonMatch) {
        const jsonResponse = {
          Category: jsonMatch[1],
          Subcategory: jsonMatch[2]
        };
        setFinalJson(jsonResponse);
        setFinalSubgenre([jsonResponse.Subcategory]); // Set the final subgenre based on the JSON response
        window.speechSynthesis.cancel(); // Stop any ongoing speech
      } else {
        setCurrentQuestion(nextQuestion);
        speak(nextQuestion);
        setConversationContext(prev => `${prev} User: ${response}. AI: ${nextQuestion}.`);
      }
    } catch (error) {
      console.error('Error fetching from OpenAI:', error);
      setCurrentQuestion('Sorry, there was an error processing your request.');
      speak('Sorry, there was an error processing your request.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserResponse = (response) => {
    setUserResponse(response);
    askOpenAI(response); // Pass the user response to OpenAI
  };

  const startVoiceRecognition = () => {
    console.log('Starting voice recognition...'); // Add this line
    setUserResponse(''); // Clear the search bar text
    setIsRecording(true); // Set recording state to true
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.onresult = (event) => {
      const spokenResponse = event.results[0][0].transcript; // Capture spoken response
      setUserResponse(spokenResponse); // Update state with spoken response
      handleUserResponse(spokenResponse); // Process the response
    };
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error); // Handle errors
    };
    recognition.onend = () => {
      setIsRecording(false); // Reset recording state when done
    };
    recognition.start(); // Start voice recognition
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleUserResponse(userResponse); // Submit the response on Enter key press
    }
  };

  return (
    <div className="App">
      <div className="input-container">
        <input
          type="text"
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your question here..."
          className="search-input"
        />
        <button onClick={startVoiceRecognition} className="speak-button" disabled={loading || isSpeaking}>
          {isRecording ? 'Listening...' : '🎤'}
        </button>
      </div>
      {isSpeaking && <p>AI is speaking...</p>}
      {currentQuestion && <p>{currentQuestion}</p>}
      {finalSubgenre.length > 0 && <ServiceDisplay services={finalSubgenre} />} {/* Use the new component */}
      {finalJson && <JsonDisplay json={finalJson} />} {/* Render JsonDisplay when JSON is detected */}
    </div>
  );
}

export default App;
