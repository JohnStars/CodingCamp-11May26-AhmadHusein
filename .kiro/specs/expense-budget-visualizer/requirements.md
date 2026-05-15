# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application that allows users to track personal expenses by entering transactions with an item name, amount in IDR, and a predefined category. The app displays a running total balance in IDR, a scrollable transaction list with delete capability, and a live pie chart showing spending distribution by category. All data is persisted in the browser's Local Storage with no backend required. The app is built with plain HTML, CSS, and Vanilla JavaScript, structured with one CSS file in `css/` and one JavaScript file in `js/`, and must run as a standalone application compatible with all modern browsers. The app also includes a monthly summary view, a dark/light mode toggle, and a spending limit highlight feature.

---

## Glossary

- **App**: The Expense and Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an Item Name, Amount, and Category.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions.
- **Input_Form**: The UI form component used to submit new transactions.
- **Balance_Display**: The UI component at the top of the page that shows the current total balance in IDR.
- **Pie_Chart**: The visual chart component that displays spending distribution by category, rendered using Chart.js.
- **Category**: A fixed set of labels used to classify transactions. Valid values are: Food, Transport, Fun.
- **Local_Storage**: The browser's Web Storage API used for client-side data persistence.
- **Item_Name**: A text label identifying what was purchased or spent on. Maximum 100 characters.
- **Amount**: A positive integer value in IDR (Indonesian Rupiah), minimum 1, representing the cost of a transaction.
- **Empty State**: A visible placeholder message shown when no data is available to display.
- **Spending_Limit**: A user-defined IDR threshold above which a transaction is visually highlighted.
- **Monthly_Summary**: An aggregated view of total spending grouped by month and category.
- **Theme**: The visual color scheme of the App, either Light or Dark.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to enter expense details through a form, so that I can record my spending quickly and accurately.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for Item_Name (maximum 100 characters), a numeric field for Amount (positive integer in IDR), and a dropdown selector for Category with exactly three options: Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled with valid, non-whitespace content and a valid Amount, THE App SHALL create a new Transaction and add it to the data store.
3. IF the user submits the Input_Form with the Item_Name field empty or containing only whitespace, THEN THE Input_Form SHALL display a validation error message identifying the Item_Name field as missing.
4. IF the user submits the Input_Form without selecting a Category, THEN THE Input_Form SHALL display a validation error message indicating that a Category must be selected.
5. IF the user enters a value in the Amount field that is non-numeric, zero, negative, or not a positive integer, THEN THE Input_Form SHALL display a validation error message stating that the amount must be a positive whole number in IDR.
6. IF the user enters a value in the Item_Name field that exceeds 100 characters, THEN THE Input_Form SHALL display a validation error message stating the maximum length is 100 characters.
7. WHEN a Transaction is successfully submitted, THE Input_Form SHALL clear the Item_Name and Amount fields to empty strings, reset the Category dropdown to its default unselected state, and return focus to the Item_Name field.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored transactions, each showing the Item_Name, Amount (formatted as IDR currency, e.g., "Rp 50.000"), and Category.
2. WHILE transactions exist in the data store, THE Transaction_List SHALL be scrollable when the number of entries causes the list height to exceed its fixed container height.
3. WHEN a new Transaction is added, THE Transaction_List SHALL update within 1 second to include the new entry without requiring a page reload.
4. THE Transaction_List SHALL provide a clearly labelled delete control for each transaction entry.
5. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the data store within 1 second.
6. WHEN the user activates the delete control for a transaction, THE Transaction_List SHALL update within 1 second to no longer display the deleted entry without requiring a page reload.
7. IF no transactions exist in the data store, THEN THE Transaction_List SHALL display a visible empty-state message (e.g., "No transactions yet") in place of the list.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL be positioned at the top of the App's main view, above the Input_Form and Transaction_List.
2. THE Balance_Display SHALL show the sum of the Amount values of all stored transactions, formatted as IDR currency (e.g., "Rp 150.000").
3. WHEN a new Transaction is added, THE Balance_Display SHALL update its displayed total within 1 second, in the same render cycle as the Transaction_List update.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL update its displayed total within 1 second, in the same render cycle as the Transaction_List update.
5. WHILE no transactions exist in the data store, THE Balance_Display SHALL show a total of "Rp 0" (or the equivalent formatted zero value in IDR).

---

### Requirement 4: Pie Chart Visualization

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going at a glance.

#### Acceptance Criteria

1. THE Pie_Chart SHALL display each Category (Food, Transport, Fun) as a distinct segment, sized proportionally to that category's share of the total Amount across all transactions, where transactions sharing the same Category are grouped together.
2. WHEN a new Transaction is added, THE Pie_Chart SHALL update within 1 second to reflect the new category distribution without requiring a page reload.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL update within 1 second to reflect the revised category distribution without requiring a page reload.
4. THE Pie_Chart SHALL render each category segment in a visually distinct color, such that no two segments share the same color.
5. THE Pie_Chart SHALL display a legend identifying each category by name and showing its percentage of total spending.
6. WHEN the last remaining Transaction is deleted, THE Pie_Chart SHALL display an empty or placeholder state within 1 second.
7. WHILE no transactions exist in the data store, THE Pie_Chart SHALL display an empty or placeholder state (e.g., a message "No spending data").
8. THE Pie_Chart SHALL be rendered using Chart.js loaded via CDN.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE App SHALL serialize the updated transaction list as JSON and write it to Local_Storage before the UI reflects the new entry.
2. WHEN a Transaction is deleted, THE App SHALL serialize the updated transaction list as JSON and write it to Local_Storage before the UI reflects the removal.
3. WHEN the App initializes, THE App SHALL read all transactions from Local_Storage and populate the Transaction_List, Balance_Display, and Pie_Chart with the stored data before any user interaction is possible.
4. IF Local_Storage is unavailable or returns a JSON parse error on initialization, THEN THE App SHALL initialize with an empty transaction list and display a non-blocking error notification that remains visible for at least 5 seconds or until the user dismisses it.
5. IF a Local_Storage write fails after a Transaction is created or deleted, THEN THE App SHALL retain the UI change and display a non-blocking dismissible error notification that remains visible for at least 5 seconds, informing the user that the data could not be saved.

---

### Requirement 6: Technology and Compatibility Constraints

**User Story:** As a developer, I want the app built with plain HTML, CSS, and Vanilla JavaScript in a defined folder structure, so that it runs without any build tools, frameworks, or backend server.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no JavaScript frameworks (e.g., no React, Vue, Angular, or jQuery). Chart.js loaded via CDN is the only permitted external library.
2. THE App SHALL consist of one HTML file at the root, exactly one CSS file located in the `css/` folder, and exactly one JavaScript file located in the `js/` folder, with no build step, compilation, or package manager required to run.
3. THE App SHALL function correctly as a standalone set of files opened directly in a browser without a backend server or local development server.
4. THE App SHALL make no network requests at runtime other than the initial CDN load of Chart.js; all other functionality SHALL operate using only browser-native APIs.
5. THE App SHALL render and operate correctly in the current stable versions of Chrome, Firefox, Edge, and Safari.
6. WHERE the App is packaged as a browser extension, THE App SHALL comply with the browser extension manifest requirements for the target browser without altering core functionality. This criterion applies only when the App is packaged as an extension and does not apply when the App runs as a standalone file.

---

### Requirement 7: Monthly Summary View

**User Story:** As a user, I want to see a summary of my spending grouped by month, so that I can track how my expenses change over time.

#### Acceptance Criteria

1. THE App SHALL provide a Monthly_Summary view that displays total spending per month, grouped by calendar month and year (e.g., "May 2026").
2. THE Monthly_Summary SHALL break down each month's total by Category (Food, Transport, Fun), showing the amount spent per category within that month.
3. WHEN a new Transaction is added, THE Monthly_Summary SHALL update within 1 second to reflect the new entry in the correct month without requiring a page reload.
4. WHEN a Transaction is deleted, THE Monthly_Summary SHALL update within 1 second to reflect the removal from the correct month without requiring a page reload.
5. IF no transactions exist for a given month, THEN that month SHALL NOT appear in the Monthly_Summary view.
6. THE Monthly_Summary SHALL be accessible from the main view via a clearly labelled navigation control (e.g., a button or tab labelled "Monthly Summary").

---

### Requirement 8: Spending Limit Highlight

**User Story:** As a user, I want transactions that exceed a spending limit I set to be visually highlighted, so that I can quickly identify overspending.

#### Acceptance Criteria

1. THE App SHALL provide a Spending_Limit input field where the user can enter a positive integer IDR value as their spending threshold.
2. WHEN the user sets a Spending_Limit, THE App SHALL save the Spending_Limit value to Local_Storage so it persists across sessions.
3. WHILE a Spending_Limit is set, THE Transaction_List SHALL apply a distinct visual highlight (e.g., a colored border or background) to every transaction entry whose Amount exceeds the Spending_Limit.
4. WHEN a new Transaction is added whose Amount exceeds the current Spending_Limit, THE Transaction_List SHALL display that entry with the highlight applied within 1 second.
5. WHEN the user updates the Spending_Limit, THE Transaction_List SHALL re-evaluate and update the highlight state of all existing entries within 1 second.
6. IF no Spending_Limit is set, THEN no transaction entries SHALL be highlighted.

---

### Requirement 9: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light visual themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a clearly labelled toggle control (e.g., a button or switch labelled "Dark Mode" / "Light Mode") that switches the App's Theme between Light and Dark.
2. WHEN the user activates the theme toggle, THE App SHALL switch the active Theme within 1 second without requiring a page reload.
3. WHEN the user activates the theme toggle, THE App SHALL save the selected Theme to Local_Storage so it persists across sessions.
4. WHEN the App initializes, THE App SHALL read the saved Theme from Local_Storage and apply it before any content is rendered, preventing a flash of the wrong theme.
5. IF no Theme preference is saved in Local_Storage, THEN THE App SHALL default to the Light Theme on initialization.
6. THE Dark Theme SHALL apply a dark background color and light foreground text throughout the entire App, including the Transaction_List, Input_Form, Balance_Display, Pie_Chart, and Monthly_Summary view.
7. THE Light Theme SHALL apply a light background color and dark foreground text throughout the entire App.

---

### Requirement 10: Non-Functional Requirements

**User Story:** As a user, I want the app to be simple, fast, and visually clear, so that I can use it without friction or confusion.

#### Acceptance Criteria

1. THE App SHALL present a clean, minimal interface with no unnecessary UI elements, such that a new user can understand how to add a transaction without reading any instructions.
2. THE App SHALL require no complex setup; opening the HTML file directly in a supported browser SHALL be sufficient to use all features.
3. THE App SHALL load and render all UI components within 3 seconds on a standard broadband connection (excluding Chart.js CDN load time on first visit).
4. WHEN the user adds or deletes a transaction, THE App SHALL update all affected UI components (Transaction_List, Balance_Display, Pie_Chart, Monthly_Summary) within 1 second with no noticeable lag.
5. THE App SHALL use a clear visual hierarchy with readable typography, ensuring that the Balance_Display is the most prominent element, followed by the Input_Form, Transaction_List, and Pie_Chart.
6. THE App SHALL use consistent spacing, font sizes, and color contrast ratios that meet WCAG 2.1 AA minimum contrast requirements for both Light and Dark themes.
