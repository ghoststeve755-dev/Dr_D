# Habit Scoring System

Implement the habit system using two input types only:

## 1. Boolean Habit (Yes / No)

Used for habits like:

* Wake Up Before 6 AM
* Exercise
* Sleep Before 11 PM
* Diet Followed
* Intermittent Fasting Followed

Scoring:

* Yes = 1 point
* No = 0 points

---

## 2. Number Habit

Used for habits that require numeric input.

### Study Hours

Input: Decimal hours (e.g. 2.5, 4, 5.5)

Scoring:

* 0 hours = 0 points
* Greater than 0 and up to 3 hours = 0.5 points
* More than 3 hours = 1 point

---

### Reading

Input: Number of pages

Scoring:

* Every 10 pages = 1 point

Formula:

Reading Score = Pages ÷ 10

Examples:

* 10 pages = 1 point
* 20 pages = 2 points
* 35 pages = 3.5 points
* 70 pages = 7 points

---

### Money Earned

Input: Amount in Rupees

Scoring:

* Every ₹100 earned = +1 point

Formula:

Money Earned Score = Earned Amount ÷ 100

Example:

* ₹2,000 = 20 points

---

### Money Spent

Input: Amount in Rupees

Scoring:

* Every ₹100 spent = -1 point

Formula:

Money Spent Score = -(Spent Amount ÷ 100)

Example:

* ₹500 spent = -5 points

---

# Weekly Score

Weekly score should automatically calculate the sum of all habit scores for the week.

Examples:

* Boolean habits = Total completed days × 1 point
* Study = Sum of daily study scores
* Reading = Total pages ÷ 10
* Money Earned = Total earned ÷ 100
* Money Spent = -(Total spent ÷ 100)

Overall Weekly Score = Sum of all individual scores.

---

# Dynamic Habit Creation

Users should be able to create new habits from the Settings page without modifying the code.

For every new habit, ask only the following:

1. Habit Name
2. Habit Type

   * Boolean (Yes / No)
   * Number
3. Points Rule

For **Boolean** habits:

* Yes = X points
* No = 0 points

For **Number** habits:

Allow the user to define a simple scoring rule, such as:

* Divide by a value (e.g. Pages ÷ 10)
* Fixed threshold (e.g. More than 3 = 1 point)
* Custom point value

All habit scoring should be configurable through the application settings instead of being hardcoded.
