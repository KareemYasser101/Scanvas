# 🎓 Scanvas

**Scanvas** is a smart web-based tool that automates the process of taking attendance in classrooms by combining **computer vision** with the **Canvas LMS API**.

Instead of manually entering student attendance, instructors can simply upload a **photo of a handwritten attendance sheet**, and Scanvas will:
1. Extract student IDs using **OCR (Optical Character Recognition)**
2. Match those IDs to enrolled students in a Canvas course
3. Automatically mark them as "present" via a designated **attendance assignment** using the **Canvas REST API**

---

## 🚀 Features

- 📸 Upload a photo of an attendance sheet (supports handwriting)
- 🧠 Uses OCR to extract student IDs
- 🧾 Generates or updates an "Attendance" assignment in Canvas
- ✅ Automatically marks students as present based on the image
- 🔒 Secure: uses personal API token tied to your Canvas account

---

## 🛠 Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js / Python
- **OCR Engine:** Custom computer vision model built by our team
- **Canvas Integration:** [canvasapi](https://github.com/ucfopen/canvasapi)
- **Image Processing:** OpenCV, Pillow
