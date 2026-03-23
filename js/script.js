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

    // 3. Report Form Handling (Matches sample screenshot UI)
    const reportForm = document.getElementById('reportForm');
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.querySelector('.upload-zone');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');

    // Make upload zone clickable since it's now a div
    if (uploadZone && fileInput) {
        uploadZone.style.cursor = 'pointer';
        uploadZone.addEventListener('click', () => fileInput.click());
    }

    // File selection & preview logic
    function handleFileSelect(file) {
        if (!file) return;

        // Validation: Type & Size
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file format. Please upload JPG or PNG.');
            fileInput.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File is too large! Maximum limit is 5MB.');
            fileInput.value = '';
            return;
        }

        // Update placeholder to show green icon as per sample screenshot
        if (uploadPlaceholder) {
            uploadPlaceholder.innerHTML = `
                <i class="bi bi-file-earmark-check-fill display-4 text-success mb-2"></i>
                <p class="small text-muted mb-0">Selected: ${file.name}</p>
                <input type="file" class="d-none" id="fileInput">
            `;
            // Re-bind input and listener if element was replaced by innerHTML
            const newFileInput = document.getElementById('fileInput');
            newFileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
        }
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
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
            const currentFileInput = document.getElementById('fileInput');
            if (currentFileInput) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                currentFileInput.files = dataTransfer.files;
            }
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
            const selectEl = reportForm.querySelector('select');
            const locationEl = reportForm.querySelector('input[type="text"]');
            const descEl = reportForm.querySelector('textarea');
            const currentFileInput = document.getElementById('fileInput');
            
            const issueType = selectEl.value;
            const location = locationEl.value;
            const description = descEl.value;
            const evidenceFile = currentFileInput ? currentFileInput.files[0] : null;

            if (!issueType || !location || !description) {
                alert('All fields are required!');
                return;
            }

            // Start Processing State (Matches sample blue color)
            submitBtn.disabled = true;
            submitBtn.style.backgroundColor = '#4e89ff'; 
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
                    const fileExtension = evidenceFile.name.split('.').pop() || 'png';
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

                // 3. Success Alert
                alert(`Success! Your report has been submitted. Tracking ID: ${trackingId}`);

                // 4. Reset UI
                reportForm.reset();
                if (uploadPlaceholder) {
                    uploadPlaceholder.innerHTML = `
                        <i class="bi bi-cloud-arrow-up display-6 text-primary mb-2"></i>
                        <p class="small text-muted mb-0">Click to upload or drag & drop</p>
                        <input type="file" class="d-none" id="fileInput">
                    `;
                    const resetFileInput = document.getElementById('fileInput');
                    resetFileInput.addEventListener('change', (ev) => handleFileSelect(ev.target.files[0]));
                }

            } catch (err) {
                console.error("Submission failed:", err);
                alert('Submission failed: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.style.backgroundColor = ''; 
                submitBtn.innerHTML = originalBtnContent;
            }
        });
    }

    // 4. Smooth Scroll
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
