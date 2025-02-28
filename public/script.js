let quizData = [];
let currentQuestionIndex = 0;
let grade = 0;
let userAnswers = []; // Store user's answers

// Fetch user info on page load
async function fetchUserInfo() {
  const response = await fetch('/user');
  const user = await response.json();

  if (user.error) {
    // User is not authenticated, show the Google Sign-In button
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('quiz-generator').classList.add('hidden');
    document.getElementById('quizOutput').classList.add('hidden');
    document.getElementById('user-info').classList.add('hidden');
  } else {
    // User is authenticated, show the quiz generator
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('quiz-generator').classList.remove('hidden');
    document.getElementById('user-info').classList.remove('hidden');

    // Display user info
    document.getElementById('profilePicture').src = user.profilePicture;
    document.getElementById('displayName').textContent = user.displayName;
    document.getElementById('points').textContent = `Points: ${user.points}`;
  }
}

// Handle Google Sign-In button click
document.getElementById('googleSignInBtn').addEventListener('click', () => {
  window.location.href = '/auth/google';
});

// Handle sign-out button click
document.getElementById('signOutBtn').addEventListener('click', () => {
  window.location.href = '/auth/logout';
});

// Handle quiz generation
document.getElementById('generateQuizBtn').addEventListener('click', async () => {
  const language = document.getElementById('language').value;
  const subject = document.getElementById('subject').value;
  const paragraphs = document.getElementById('paragraphs').value;

  if (!language || !subject || !paragraphs) {
    alert('Please select a language, subject, and provide paragraphs.');
    return;
  }

  try {
    const response = await fetch('/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, subject, paragraphs }),
    });

    const result = await response.json();

    if (response.ok) {
      quizData = result.quiz;
      currentQuestionIndex = 0;
      grade = 0;
      userAnswers = []; // Reset user answers
      document.getElementById('quiz-generator').classList.add('hidden');
      document.getElementById('quizOutput').classList.remove('hidden');
      updateProgress();
      displayQuestion();
    } else {
      alert(result.error || 'Error generating quiz. Please try again.');
    }
  } catch (error) {
    alert('An error occurred while generating the quiz.');
    console.error(error);
  }
});

// Handle next question button click
document.getElementById('nextQuestionBtn').addEventListener('click', () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < quizData.length) {
    updateProgress();
    displayQuestion();
  } else {
    // Quiz completed, send answers to the backend
    sendAnswersAndUpdatePoints();
  }
});

// Display the current question
function displayQuestion() {
  const questionContainer = document.getElementById('questionContainer');
  const nextQuestionBtn = document.getElementById('nextQuestionBtn');
  const currentQuestion = quizData[currentQuestionIndex];

  questionContainer.innerHTML = `
    <h3>${currentQuestion.question}</h3>
    <ul>
      ${Object.entries(currentQuestion.choices).map(([key, value]) => `
        <li>
          <button class="choice" data-key="${key}">${key}: ${value}</button>
        </li>
      `).join('')}
    </ul>
  `;

  nextQuestionBtn.classList.add('hidden');

  document.querySelectorAll('.choice').forEach(button => {
    button.addEventListener('click', () => {
      validateAnswer(button, currentQuestion.correctAnswer);
    });
  });
}

// Validate the selected answer
function validateAnswer(selectedButton, correctAnswer) {
  const allButtons = document.querySelectorAll('.choice');
  const selectedKey = selectedButton.getAttribute('data-key');

  allButtons.forEach(button => {
    const buttonKey = button.getAttribute('data-key');
    button.disabled = true;

    if (buttonKey === correctAnswer) {
      button.classList.add('correct');
      if (selectedKey === correctAnswer) {
        grade += 10; // Add 10 points for correct answer
        userAnswers[currentQuestionIndex] = true; // Mark as correct
      }
    } else if (buttonKey === selectedKey && selectedKey !== correctAnswer) {
      button.classList.add('incorrect');
      userAnswers[currentQuestionIndex] = false; // Mark as incorrect
    } else {
      button.classList.add('disabled');
    }
  });

  updateProgress();
  document.getElementById('nextQuestionBtn').classList.remove('hidden');
}

// Update progress and grade
function updateProgress() {
  document.getElementById('questionNumber').textContent = `Question ${currentQuestionIndex + 1} of 10`;
  document.getElementById('grade').textContent = `Grade: ${grade}/100`;
}

// Send answers to the backend and update points
async function sendAnswersAndUpdatePoints() {
  try {
    const response = await fetch('/update-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: userAnswers }),
    });

    const result = await response.json();

    if (response.ok) {
      alert(`Quiz completed! Your final grade is ${grade}/100.`);
      document.getElementById('quizOutput').classList.add('hidden');
      document.getElementById('quiz-generator').classList.remove('hidden');
      fetchUserInfo(); // Refresh points after quiz completion
    } else {
      alert(result.error || 'Error updating points. Please try again.');
    }
  } catch (error) {
    alert('An error occurred while updating points.');
    console.error(error);
  }
}

// Fetch user info when the page loads
fetchUserInfo();