const routineForm = document.getElementById('routineForm');
const STORAGE_KEY = 'routinePreferences';

// Read current form values so we can save or send them
function getRoutinePreferences() {
  const timeOfDay = document.getElementById('timeOfDay').value;
  const focusArea = document.getElementById('focusArea').value;
  const timeAvailable = document.getElementById('timeAvailable').value;
  const energyLevel = document.getElementById('energyLevel').value;
  const selectedActivities = Array.from(
    document.querySelectorAll('input[name="activities"]:checked')
  ).map((activity) => activity.value);

  return {
    timeOfDay,
    focusArea,
    timeAvailable,
    energyLevel,
    selectedActivities
  };
}

// Save preferences in localStorage so they persist between visits
function saveRoutinePreferences() {
  const preferences = getRoutinePreferences();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

// Restore saved preferences when the page loads
function loadRoutinePreferences() {
  const savedPreferencesText = localStorage.getItem(STORAGE_KEY);
  if (!savedPreferencesText) {
    return;
  }

  try {
    const savedPreferences = JSON.parse(savedPreferencesText);

    if (savedPreferences.timeOfDay) {
      document.getElementById('timeOfDay').value = savedPreferences.timeOfDay;
    }
    if (savedPreferences.focusArea) {
      document.getElementById('focusArea').value = savedPreferences.focusArea;
    }
    if (savedPreferences.timeAvailable) {
      document.getElementById('timeAvailable').value = savedPreferences.timeAvailable;
    }
    if (savedPreferences.energyLevel) {
      document.getElementById('energyLevel').value = savedPreferences.energyLevel;
    }

    // Re-check activity boxes that were selected previously
    const savedActivities = savedPreferences.selectedActivities || [];
    document.querySelectorAll('input[name="activities"]').forEach((checkbox) => {
      checkbox.checked = savedActivities.includes(checkbox.value);
    });
  } catch (error) {
    console.error('Could not load saved preferences:', error);
  }
}

// Load saved values once, then keep saving whenever a user changes any input
loadRoutinePreferences();
routineForm.addEventListener('change', saveRoutinePreferences);

// Add an event listener to the form that runs when the form is submitted
routineForm.addEventListener('submit', async (e) => {
  // Prevent the form from refreshing the page
  e.preventDefault();
  
  // Get values from all form inputs
  const {
    timeOfDay,
    focusArea,
    timeAvailable,
    energyLevel,
    selectedActivities
  } = getRoutinePreferences();

  // Save again on submit so newest choices are always persisted
  saveRoutinePreferences();

  // Add a fallback so the prompt still works if no activities are selected
  const preferredActivities = selectedActivities.length > 0
    ? selectedActivities.join(', ')
    : 'No specific preferences';
  
  // Find the submit button and update its appearance to show loading state
  const button = document.querySelector('button[type="submit"]');
  button.innerHTML = 'Generating...';
  button.disabled = true;
  
  // Clear old output and make sure the result area is visible while loading
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('routineOutput').textContent = 'Building your routine...';
  
  try {    
    // Guard against missing API key so students see a clear next step
    if (typeof OPENAI_API_KEY === 'undefined' || !OPENAI_API_KEY) {
      throw new Error('Missing API key. Add OPENAI_API_KEY in secrets.js.');
    }

    // Make the API call to OpenAI's chat completions endpoint
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [      
          { role: 'system', content: `You are a helpful assistant that creates quick, focused daily routines. Always keep routines short, realistic, and tailored to the user's preferences.` },
          {
            role: 'user',
            content: `Plan a personalized daily routine using these details:
Time of day: ${timeOfDay}
Focus area: ${focusArea}
Time available: ${timeAvailable} minutes
Energy level: ${energyLevel}
Preferred activities: ${preferredActivities}

Please provide a structured, step-by-step routine that fits these parameters. Include numbered steps, short time estimates for each step, and keep the total routine within the available time.`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    // Convert API response to JSON
    const data = await response.json();

    // Show a helpful error if the API returns a non-2xx response
    if (!response.ok) {
      const apiErrorMessage = data.error?.message || 'Request failed. Please try again.';
      throw new Error(apiErrorMessage);
    }

    // Get the generated routine text
    const routine = data.choices[0].message.content;
    
    // Display the routine
    document.getElementById('routineOutput').textContent = routine;
    
  } catch (error) {
    // If anything goes wrong, log the error and show user-friendly message
    console.error('Error:', error);
    document.getElementById('routineOutput').textContent = `Sorry, there was an error generating your routine: ${error.message}`;
  } finally {
    // Always reset the button back to its original state using innerHTML to render the icon
    button.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate My Routine';
    button.disabled = false;
  }
});
