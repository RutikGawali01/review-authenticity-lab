Project Development Guidelines
Code Quality Standards
General Principles
Write production-quality, maintainable, and readable code.
Prioritize clarity over cleverness.
Keep modules small and focused on a single responsibility.
Avoid code duplication (DRY principle).
Follow consistent naming conventions throughout the project.
Prefer composition over deeply nested logic.
Every function should have one clear purpose.
Architecture
Maintain a modular folder structure.
Separate concerns clearly:
DOM extraction
Analysis
Storage
UI
Models
Utilities
Avoid tight coupling between modules.
Design components to be reusable and testable.
Do not place business logic inside UI files.
Function Design
Keep functions small (ideally under 40 lines).
Break complex logic into helper functions.
Avoid deeply nested if statements.
Prefer early returns.
Use descriptive function and variable names.
Avoid large files; split files when responsibilities grow.

Example:

❌ Bad

function analyzeEverything() {
    // 300+ lines
}

✅ Good

extractReviews()
normalizeReviews()
detectDuplicates()
detectMismatch()
generateSummary()
Error Handling

Never silently ignore errors.

Always:

Validate inputs.
Handle missing DOM elements gracefully.
Handle unavailable browser APIs.
Wrap asynchronous operations in try/catch.
Display meaningful user-friendly messages.
Log useful debugging information during development.

Example:

try {
    const reviews = await extractReviews();
} catch (error) {
    console.error("Review extraction failed:", error);
    showNotification("Unable to analyze this page.");
}
DOM Handling
Never assume an element exists.
Always check for null.
Avoid fragile selectors when possible.
Use reusable selector helper functions.
Handle dynamic content with MutationObserver.
Asynchronous Code
Prefer async/await.
Avoid long promise chains.
Handle rejected promises.
Never leave unresolved asynchronous operations.
Performance
Avoid unnecessary DOM traversals.
Cache frequently accessed elements.
Minimize expensive computations.
Lazy-load AI models.
Reuse loaded models.
Debounce expensive observers where appropriate.
AI Model Usage
Load Transformers.js only once.
Reuse the loaded pipeline.
Never reload models unnecessarily.
Handle inference failures gracefully.
Keep inference separate from UI logic.
Data Models

Use consistent object models.

Example:

Review
Snapshot
SignalResult
ManualLabel
Product

Avoid ad-hoc object structures throughout the project.

Storage
Centralize all IndexedDB operations.
Never access IndexedDB directly from UI components.
Validate stored data.
Handle schema upgrades cleanly.
UI
Keep popup and side panel lightweight.
Separate rendering from business logic.
Avoid inline styles.
Keep CSS modular.
Show loading indicators during analysis.
Display clear progress and error states.
Logging

Development:

console.debug(...)
console.warn(...)
console.error(...)

Production:

Remove unnecessary logs.
Keep only meaningful error logging.
Code Style
Use ES6+ syntax.
Prefer const over let.
Never use var.
Use optional chaining (?.) where appropriate.
Use nullish coalescing (??) instead of unnecessary logical ORs.
Keep consistent formatting.
Documentation

Every module should begin with a brief description of its responsibility.

Complex functions should include concise JSDoc comments.

Example:

/**
 * Extracts visible reviews from the current product page.
 * Returns normalized Review objects.
 */
Git Workflow
Build one feature per commit.
Use meaningful commit messages.

Examples:

feat: implement review extraction

feat: add sentiment analysis

fix: handle missing reviewer names

refactor: simplify duplicate detection

docs: update architecture
Testing Checklist

Before completing any feature:

No console errors.
No unhandled promise rejections.
Handles empty review pages.
Handles dynamic content.
Handles malformed review data.
UI remains responsive.
Existing features continue working.
Development Philosophy
Build incrementally.
Finish one feature completely before starting the next.
Refactor immediately when duplication appears.
Favor readability over premature optimization.
Every feature should be production-ready before moving on.
Think like a software engineer, not just a prototype builder.