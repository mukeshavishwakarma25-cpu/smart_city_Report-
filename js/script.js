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
    
    // 1. Navbar Scroll Effect
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
                    backgroundColor: [
                        '#948979', // resolved (accent)
                        '#393E46', // in progress (secondary)
                        '#222831'  // pending (primary)
                    ],
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
                            font: {
                                family: 'Outfit',
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    // 3. Report Form Submission (Integrated with Firebase Firestore & Storage)
    const reportForm = document.getElementById('reportForm');
    const reportFeedback = document.getElementById('reportFeedback');
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.querySelector('.upload-zone');
    
    if (reportForm) {
        reportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form values
            const issueType = this.querySelector('select').value;
            const location = this.querySelector('input[type="text"]').value;
            const description = this.querySelector('textarea').value;
            const evidenceFile = fileInput ? fileInput.files[0] : null;
            
            // Get button and show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
            
            // Clear previous feedback
            if (reportFeedback) {
                reportFeedback.className = 'alert alert-info py-2 small';
                reportFeedback.textContent = 'Submitting your report, please wait...';
                reportFeedback.classList.remove('d-none');
            }

            try {
                let evidenceUrl = null;

                // 1. Upload File to Firebase Storage if exists
                if (evidenceFile) {
                    if (reportFeedback) reportFeedback.textContent = 'Uploading evidence...';
                    const fileRef = ref(storage, `evidence/${Date.now()}_${evidenceFile.name}`);
                    const uploadResult = await uploadBytes(fileRef, evidenceFile);
                    evidenceUrl = await getDownloadURL(uploadResult.ref);
                }

                // 2. Save Data to Firestore
                if (reportFeedback) reportFeedback.textContent = 'Saving report metadata...';
                const docRef = await addDoc(collection(db, "reports"), {
                    issueType: issueType,
                    location: location,
                    description: description,
                    evidenceUrl: evidenceUrl,
                    status: "Pending",
                    timestamp: serverTimestamp()
                });

                console.log("Document written with ID: ", docRef.id);
                
                // Show success on screen
                if (reportFeedback) {
                    reportFeedback.className = 'alert alert-success py-3';
                    reportFeedback.innerHTML = `
                        <div class="d-flex align-items-center">
                            <i class="bi bi-check-circle-fill me-2 fs-4"></i>
                            <div>
                                <strong class="d-block">Success! Report Submitted</strong>
                                <small>Tracking ID: <strong>${docRef.id}</strong></small>
                            </div>
                        </div>
                    `;
                }

                // Reset form and UI
                reportForm.reset();
                if (uploadZone) {
                    const uploadPara = uploadZone.querySelector('p');
                    const uploadIcon = uploadZone.querySelector('i');
                    if (uploadPara) uploadPara.textContent = 'Click to upload or drag & drop';
                    if (uploadIcon) uploadIcon.className = 'bi bi-cloud-arrow-up display-6 text-primary mb-2';
                }

            } catch (error) {
                console.error("Error adding document: ", error);
                if (reportFeedback) {
                    reportFeedback.className = 'alert alert-danger py-2 small';
                    reportFeedback.textContent = 'Error: ' + error.message;
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // 4. File Upload Visualization & Interaction
    if (uploadZone && fileInput) {
        // Automatically handled by <label for="fileInput">, 
        // we just need the 'change' event to update UI
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const fileName = file.name;
                const uploadPara = uploadZone.querySelector('p');
                const uploadIcon = uploadZone.querySelector('i');
                if (uploadPara) uploadPara.textContent = 'Selected: ' + fileName;
                if (uploadIcon) uploadIcon.className = 'bi bi-file-earmark-check-fill display-6 text-success mb-2';
            }
        });

        // Simple drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.backgroundColor = 'rgba(13, 110, 253, 0.1)';
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.style.backgroundColor = '';
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.style.backgroundColor = '';
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                const fileName = e.dataTransfer.files[0].name;
                const uploadPara = uploadZone.querySelector('p');
                const uploadIcon = uploadZone.querySelector('i');
                if (uploadPara) uploadPara.textContent = 'Dropped: ' + fileName;
                if (uploadIcon) uploadIcon.className = 'bi bi-file-earmark-check-fill display-6 text-success mb-2';
            }
        });
    }

    // 5. Smooth Scroll for all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                const target = document.querySelector(targetId);
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });
                    
                    // Close navbar on mobile after click
                    const navbarCollapse = document.getElementById('navbarContent');
                    if (navbarCollapse && typeof bootstrap !== 'undefined') {
                        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse, { toggle: false });
                        bsCollapse.hide();
                    }
                }
            }
        });
    });

});
