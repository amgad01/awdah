# Religious and Technical Logic (FAQ)

This document provides transparency on how religious rulings and technical constraints are handled within the Awdah application. It is intended for both users and developers to understand the basis of the app's logic.

---

## 1. Hijri Calendar & Date Calculations

### **Q: How are Hijri dates calculated?**

We use the **UMALQURA (Umm al-Qura)** calendar system, which is the official civil Hijri calendar of Saudi Arabia. Technically, this is implemented using the standard `Intl.DateTimeFormat` API available in modern Node.js environments.

### **Q: Why don't you assume every month is 30 days?**

Assuming 30 days per month (the "simplified" approach) leads to significant cumulative errors. A real Hijri year is approximately 354-355 days, not 360. By using a standard library, we ensure that:

1. Months are correctly assigned 29 or 30 days.
2. Ramadan is identified accurately based on the astronomical calculations of the chosen calendar system.
3. Your qadaa debt is calculated precisely based on actual days passed, not rough estimates.

---

## 2. Puberty (Bulugh) and Debt Calculation

### **Q: What is the age of Bulugh in the app?**

If you do not know your exact date of Bulugh, the app offers a default helper that sets it at **15 Hijri years** from your date of birth. This is based on the consensus (ijma') of the Hanafi, Shafi'i, and Hanbali schools of thought.

### **Q: How is "Missed Days" calculated?**

Debt is only calculated for the "gaps" in your practicing history.

- **Start point:** Your date of Bulugh.
- **End point:** The current date.
- **Exclusions:** Any "Practicing Periods" you add where you were consistently performing your obligations.
- **Formula:** `(Total Days from Bulugh to Today) - (Total Days in Practicing Periods)`.

---

## 3. Salah (Prayer) Qadaa

### **Q: Which prayers are included in the qadaa debt?**

The debt includes the five daily obligatory prayers: **Fajr, Dhuhr, Asr, Maghrib, and Isha**.

### **Q: What about Witr?**

In v1, Witr is not tracked as a separate qadaa debt. While the Hanafi school considers Witr obligatory (Wajib), the majority view is that it is Sunnah Mu'akkadah. To maintain cross-madhab compatibility in v1, we focus on the five agreed-upon Fard prayers.

---

## 4. Sawm (Fasting) Qadaa

### **Q: How does the app calculate missed fasts?**

The app identifies every Ramadan that occurred during your "gap" periods and counts the number of days in those specific Ramadans (29 or 30) using the Um al-Qura calendar.

---

## 5. Security and Privacy

### **Q: Is my religious data sensitive?**

Yes. Religious practice data is considered sensitive personal data.

- **Encryption:** All data is encrypted at rest in AWS DynamoDB.
- **Access:** Your logs are private to you. We do not sell or share your worship data with anyone.
- **Storage:** We do not store raw passwords; authentication is handled by AWS Cognito.

---

## 6. Technical Integrity

### **Q: How do you handle timezones?**

All religious calculations (e.g., determining which Hijri day it is) are performed using **UTC** to avoid errors caused by the user's local device settings or DST changes. This ensures that a prayer logged on "1 Ramadhan" remains "1 Ramadhan" regardless of where the user travels.

---

_Note: This doc is a living document and will be updated as new features (like menstruation exemptions or Kaffarah) are added in v2._
