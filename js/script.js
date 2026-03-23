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

    // 2. City Statistics Chart
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
    const removeFileBtn = document.getElementById('removeFile');
    
    // Bootstrap Modal for status
    const statusModalEl = document.getElementById('statusModal');
    const statusModal = statusModalEl ? new bootstrap.Modal(statusModalEl) : null;

    function showStatusPopup(title, message, type = 'success') {
        if (!statusModal) return;
        
        const iconDiv = document.getElementById('statusIcon');
        const titleEl = document.getElementById('statusTitle');
        const messageEl = document.getElementById('statusMessage');

        if (type === 'success') {
            iconDiv.innerHTML = '<i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>';
            titleEl.className = 'fw-bold mb-3 text-success';
        } else {
            iconDiv.innerHTML = '<i class="bi bi-exclamation-triangle-fill text-danger" style="font-size: 4rem;"></i>';
            titleEl.className = 'fw-bold mb-3 text-danger';
        }

        titleEl.textContent = title;
        messageEl.textContent = message;
        statusModal.show();
    }

    // File selection & preview logic
    function handleFileSelect(file) {
        if (!file) return;

        // Validation: Type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Please upload a JPG, JPEG, or PNG image.');
            fileInput.value = '';
            return;
        }

        // Validation: Size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File too large. Maximum size is 5MB.');
            fileInput.value = '';
            return;
        }

        // Show Preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewImg = imagePreview.querySelector('img');
            const fileNameDisp = document.getElementById('fileNameDisp');
            if (previewImg) previewImg.src = e.target.result;
            if (fileNameDisp) {
                fileNameDisp.innerHTML = `<i class="bi bi-patch-check-fill me-1"></i> ${file.name}`;
            }
            
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
                alert('Please fill in all required fields.');
                return;
            }

            // Start Production-Ready Submission
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Processing...
            `;

            // Generate Tracking ID
            const trackingId = 'SC-' + Math.floor(100000 + Math.random() * 900000);

            try {
                let evidenceUrl = '';

                // 1. Upload to Storage
                if (evidenceFile) {
                    const fileExtension = evidenceFile.name.split('.').pop();
                    const fileName = `${trackingId}-${Date.now()}.${fileExtension}`;
                    const storageRef = ref(storage, `reports/${fileName}`);
                    
                    const snapshot = await uploadBytes(storageRef, evidenceFile);
                    evidenceUrl = await getDownloadURL(snapshot.ref);
                }

                // 2. Save to Firestore
                await addDoc(collection(db, "reports"), {
                    trackingId,
                    issueType,
                    location,
                    description,
                    evidenceUrl,
                    status: 'Pending',
                    timestamp: serverTimestamp()
                });

                // 3. Success Popup
                showStatusPopup(
                    'Success!', 
                    `Your report has been submitted. Tracking ID: ${trackingId}`, 
                    'success'
                );

                // 4. Reset Form
                reportForm.reset();
                imagePreview.classList.add('d-none');
                uploadPlaceholder.classList.remove('d-none');

            } catch (err) {
                console.error("Submission failed:", err);
                showStatusPopup(
                    'Submission Failed', 
                    err.message || 'Something went wrong. Please try again.', 
                    'error'
                );
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
        });
    }

    // 5. Smooth Scroll for links
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
