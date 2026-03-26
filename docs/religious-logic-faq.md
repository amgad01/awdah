# Religious Logic (FAQ)

This document explains the Islamic rulings and scholarly positions that drive the app's calculations. It is intended for users who want to understand the fiqh basis of how Awdah works.

For the technical implementation details — how the codebase handles date formats, log schema decisions, and the derived-completion design — see [docs/technical-decisions.md](technical-decisions.md).

---

## 1. Hijri Calendar & Date Calculations

### **Q: How are Hijri dates calculated?**

We use the **Umm al-Qura** calendar system, which is the official civil Hijri calendar of Saudi Arabia and the most widely used standardised Hijri calendar globally.

### **Q: Why don't you assume every month is 30 days?**

A real Hijri year is approximately 354–355 days, not 360. Assuming 30 days per month produces cumulative errors that would distort your qadaa count over time. Using the Umm al-Qura calendar ensures that:

1. Months are correctly assigned 29 or 30 days as they actually fall.
2. Ramadan is identified and counted accurately.
3. Your qadaa is calculated on the actual number of days that passed, not an estimate.

---

## 2. Puberty (Bulugh) and Missed Obligations

### **Q: What is the age of Bulugh?**

Bulugh (reaching the age of religious accountability) is established by signs of puberty: wet dream or seminal emission (male), or onset of menstruation (female), or the growth of coarse pubic hair.

If none of these occur earlier, the **default age is 15 Hijri years**. This is the position of the Hanafi, Shafi'i, and Hanbali schools based on the hadith that the Prophet ﷺ inspected Ibn 'Umar before Uhud and found him not yet of age, then accepted him before Khandaq at 15 (_Sahih al-Bukhari 2664, Sahih Muslim 1868_).

### **Q: How is the missed obligations count calculated?**

Qadaa obligations accumulate only during the "gaps" in your practicing history — periods between your date of Bulugh and when you were consistently fulfilling your obligations.

- **Start:** Date of Bulugh
- **End:** Current date (or start of your next practicing period)
- **Excluded:** Any Practicing Periods you record

The formula is: `(Total days across all gap periods) × 5` for Salah, or the sum of Ramadan days that fell within gap periods for Sawm.

---

## 3. Salah (Prayer) Qadaa

### **Q: Which prayers are included in the qadaa count?**

The five daily obligatory (Fard) prayers: **Fajr, Dhuhr, Asr, Maghrib, and Isha**.

### **Q: What about Witr?**

Witr is not tracked as a separate qadaa obligation in v1. The Hanafi school considers Witr Wajib, but the majority view (Maliki, Shafi'i, Hanbali) holds it to be Sunnah Mu'akkadah. To maintain cross-madhab compatibility in v1, Awdah focuses on the five Fard prayers agreed upon by all schools.

### **Q: Is there a time limit on making up missed prayers?**

No scholarly expiry on qadaa is recognised. The obligation remains until it is fulfilled. Scholars across the four major madhabs agree on this. See _Radd al-Muhtar_ (Hanafi), _Minhaj al-Talibin_ (Shafi'i), _al-Mughni_ (Hanbali).

---

## 3.5. Reverts (Converts to Islam)

### **Q: When does qadaa start for a revert?**

A revert's obligation begins from the date they accepted Islam — not from puberty. If a person reverted at age 25, they have no qadaa debt for the years before their reversion, even though they had reached puberty long before.

### **Q: What if someone reverted before the age of 15?**

If a person reverted before the age of bulugh (puberty), their qadaa obligation starts from the date of bulugh — not the date of reversion. In this case, the user must specify their bulugh date separately. The app uses whichever date is later (revert date or bulugh date) as the effective start of obligations.

### **Q: How does the app determine the start of obligations for reverts?**

The backend compares the revert date and the bulugh date and uses the later of the two as the effective start date for all debt calculations. This ensures that a revert who was already past puberty starts from their revert date, while a revert who had not yet reached puberty starts from their bulugh date.

---

## 4. Sawm (Fasting) Qadaa

### **Q: How does the app calculate missed Ramadan fasts?**

The app identifies every Ramadan that fell within your gap periods and counts the actual days of that Ramadan (29 or 30) using the Umm al-Qura calendar — no hardcoded values.

### **Q: What about fasts broken intentionally (Kaffarah)?**

Kaffarah is out of scope for v1. All missed fasts are treated as standard qadaa regardless of the reason. Kaffarah calculation will be considered for a future release.

### **Q: What about menstruation exemptions for women?**

Also out of scope for v1. The Sawm count currently does not subtract exempted Ramadan days for menstruating women. This will be addressed in v2.

---

## 5. Security and Privacy

### **Q: Is my religious data sensitive?**

Yes. Religious practice data is considered sensitive personal data under GDPR and similar frameworks.

- **Encryption:** All data is encrypted at rest in AWS DynamoDB.
- **Access:** Your logs are private to you. We do not sell or share your data.
- **Authentication:** Handled by AWS Cognito — we never store raw passwords.
- **Deletion:** Full account deletion is available in Settings and removes all data immediately.

---

_Note: All rulings referenced here must be verified by a qualified scholar before the app is published. Scholar review status is tracked in the references content files._
