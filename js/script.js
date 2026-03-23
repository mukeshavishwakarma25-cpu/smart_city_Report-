// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB76xjx9aSH51Bmxaap-4oVxU3aQlsxfww",
  authDomain: "smart-city-web-201dd.firebaseapp.com",
  projectId: "smart-city-web-201dd",
  storageBucket: "smart-city-web-201dd.firebasestorage.app",
  messagingSenderId: "117966569184",
  appId: "1:117966569184:web:aefcc460fc63614d005a85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Navigation & Scroll Effects
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                mainNav.classList.add('navbar-scrolled');
            } else {
                mainNav.classList.remove('navbar-scrolled');
            }
        });
    }

    // 2. City Statistics Chart (Retained from previous version)
    const ctx = document.getElementById('statChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Resolved', 'In Progress', 'Pending'],
                datasets: [{
                    data: [65, 20, 15],
                    backgroundColor: ['#948979', '#393E46', '#222831'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { family: 'Outfit', size: 12 }
                        }
                    }
                }
            }
        });
    }

    // 3. Report Form Handling
    const reportForm = document.getElementById('reportForm');
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.querySelector('.upload-zone');
    const imagePreview = document.getElementById('imagePreview');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const reportFeedback = document.getElementById('reportFeedback');
    const removeFileBtn = document.getElementById('removeFile');

    // Utility: Show feedback messages
    function showFeedback(message, type = 'info', persist = false) {
        if (!reportFeedback) return;
        reportFeedback.className = `alert alert-${type} py-3 shadow-sm d-flex align-items-center`;
        reportFeedback.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'}-fill me-3 fs-4"></i>
            <div>${message}</div>
        `;
        reportFeedback.classList.remove('d-none');
        if (!persist && type !== 'info') {
            setTimeout(() => reportFeedback.classList.add('d-none'), 8000);
        }
    }

    // File selection & preview logic
    function handleFileSelect(file) {
        if (!file) return;

        // Validation: Type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            showFeedback('Invalid file type. Please upload a JPG, JPEG, or PNG image.', 'danger');
            fileInput.value = '';
            return;
        }

        // Validation: Size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showFeedback('File too large. Maximum size is 5MB.', 'danger');
            fileInput.value = '';
            return;
        }

        // Show Preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewImg = imagePreview.querySelector('img');
            const fileNameDisp = document.getElementById('fileNameDisp');
            if (previewImg) previewImg.src = e.target.result;
            if (fileNameDisp) fileNameDisp.textContent = file.name;
            
            imagePreview.classList.remove('d-none');
            uploadPlaceholder.classList.add('d-none');
        };
        reader.readAsDataURL(file);
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.value = '';
            imagePreview.classList.add('d-none');
            uploadPlaceholder.classList.remove('d-none');
        });
    }

    // Drag and Drop Logic
    if (uploadZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => uploadZone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragover'), false);
        });

        uploadZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(file);
        }, false);
    }

    // Form Submission logic
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = reportForm.querySelector('button[type="submit"]');
            const originalBtnContent = submitBtn.innerHTML;
            
            // Basic UI Validation
            const issueType = reportForm.querySelector('select').value;
            const location = reportForm.querySelector('input[type="text"]').value;
            const description = reportForm.querySelector('textarea').value;
            const evidenceFile = fileInput.files[0];

            if (!issueType || !location || !description) {
                showFeedback('Please fill in all required fields.', 'danger');
                return;
            }

            // Start Submission
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting Report...
            `;
            showFeedback('Initializing submission...', 'info', true);

            try {
                let evidenceUrl = '';

                // 1. Upload to Storage if file exists
                if (evidenceFile) {
                    showFeedback('Uploading image evidence...', 'info', true);
                    const fileExtension = evidenceFile.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
                    const storageRef = ref(storage, `reports/${fileName}`);
                    
                    const snapshot = await uploadBytes(storageRef, evidenceFile);
                    evidenceUrl = await getDownloadURL(snapshot.ref);
                }

                // 2. Save to Firestore
                showFeedback('Saving report data...', 'info', true);
                const docRef = await addDoc(collection(db, "reports"), {
                    issueType,
                    location,
                    description,
                    evidenceUrl,
                    status: 'Pending',
                    timestamp: serverTimestamp()
                });

                // 3. Success Feedback
                showFeedback('<strong>Success!</strong> Report submitted successfully. Our team will review it shortly.', 'success');
                console.log("Report saved with ID: ", docRef.id);

                // 4. Reset Form
                reportForm.reset();
                imagePreview.classList.add('d-none');
                uploadPlaceholder.classList.remove('d-none');

            } catch (err) {
                console.error("Submission failed:", err);
                showFeedback(`Submission failed: ${err.message}. Please try again.`, 'danger');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
        });
    }

    // 4. Smooth Scroll for links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const target = document.querySelector(targetId);
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });
                    // Close mobile nav
                    const navCollapse = document.getElementById('navbarContent');
                    if (navCollapse && typeof bootstrap !== 'undefined') {
                        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse) || new bootstrap.Collapse(navCollapse, { toggle: false });
                        bsCollapse.hide();
                    }
                }
            }
        });
    });

});
