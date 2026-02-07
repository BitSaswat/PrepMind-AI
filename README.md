# PrepMind AI

An intelligent exam preparation platform that generates personalized questions and study materials using Google's Vertex AI (Gemini).

## Features
- **AI Question Generation**: Generates JEE/NEET questions for Physics, Chemistry, and Math.
- **PDF Export**: Creates professional "Question Paper" and "With Solutions" PDFs.
- **Smart Retries**: Handles API rate limits automatically.
- **Vertex AI Integration**: Uses `gemini-2.5-pro` for high-quality content.

## Setup

### Prerequisites
- Node.js (v16+)
- Python (v3.10+)
- Google Cloud Project with Vertex AI API enabled.

### Backend Setup

1.  **Navigate to backend:**
    ```bash
    cd backend
    ```

2.  **Create virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # Mac/Linux
    # venv\Scripts\activate  # Windows
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment:**
    -   Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    -   Edit `.env` and set your Google Cloud Project ID:
        ```env
        GOOGLE_CLOUD_PROJECT=your-project-id-here
        PORT=5000
        ```

5.  **Run Server:**
    ```bash
    node server.js
    ```

### Frontend Setup

1.  **Serve the frontend:**
    You can use any static file server (e.g., `serve`):
    ```bash
    npx serve frontend -p 3000
    ```

2.  **Access the App:**
    Open `http://localhost:3000` in your browser.

## Troubleshooting

-   **Rate Limits:** If generation takes time, check the backend logs. The system automatically waits for Google's quota cooldowns (429 errors).
-   **Port Conflicts:** Ensure Backend runs on 5000 and Frontend on 3000.