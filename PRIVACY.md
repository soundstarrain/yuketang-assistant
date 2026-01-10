# Privacy Policy for Rain Classroom Exam Assistant (雨课堂考试助手)

**Effective Date:** December 16, 2025

## 1. Introduction
"Rain Classroom Exam Assistant" (hereinafter referred to as "the Extension") is a browser extension developed to assist users in extracting exam questions and PPT slides for study purposes. We respect your privacy and are committed to protecting your personal data.

This Privacy Policy explains how we handle your data. **In short: We (the developer) do not collect, store, or transmit any of your personal data to our own servers.** All processing happens locally on your device or directly between your browser and the AI service provider you configure.

## 2. Data Collection and Usage

### 2.1. No Data Collection by Developer
The Extension does not collect, track, or transmit any user data, usage statistics, or personal information to the developer or any servers owned by the developer. The Extension operates directly within your browser.

### 2.2. Local Storage
The Extension uses your browser's Local Storage to save your preferences and configurations. This data never leaves your browser.
*   **Configuration Data:** Includes your UI layout preferences (`layoutMode`).
*   **AI Credentials:** If you choose to use the AI solving feature, your API Endpoint URL, API Key, and Model Name (`aiConfig`) are stored locally on your device.

### 2.3. AI Features and Third-Party Services
The Extension includes a feature to solve questions using Artificial Intelligence (AI). This feature is **optional** and disabled by default.
*   **Data Transmission:** When you click "AI Solve" or "Batch Solve," the text of the questions (and only the text) is sent directly from your browser to the API Endpoint URL you configured (e.g., OpenAI or a custom proxy).
*   **User Responsibility:** You are responsible for configuring the API service. The Extension acts solely as a client interface. We do not have access to your API keys or the content you send to the AI provider.
*   Please refer to the privacy policy of the AI service provider you choose to use regarding how they handle your data.

## 3. Permissions

The Extension requests the minimum necessary permissions to function:
*   **`activeTab` / `Page Access`:** Required to read the DOM elements of the Rain Classroom page to extract questions and slides.
*   **`scripting`:** Required to inject the extraction scripts into the webpage.

## 4. Data Security
*   Your API keys are stored in your browser's Local Storage. While this is standard for browser extensions, please do not use this Extension on shared or public computers.
*   Since we do not collect any data, we do not have a database of user information to secure or breach.

## 5. Changes to This Policy
We may update this Privacy Policy from time to time. If we make significant changes, we will update the "Effective Date" at the top of this policy.

## 6. Contact

If you have any questions about this Privacy Policy, please contact the developer via the GitHub repository issues page.

