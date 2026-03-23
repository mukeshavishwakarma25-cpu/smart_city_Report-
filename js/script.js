// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

    // 3. Report Form Submission (Integrated with Firebase)
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form values
            const issueType = this.querySelector('select').value;
            const location = this.querySelector('input[type="text"]').value;
            const description = this.querySelector('textarea').value;
            
            // Get button and show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';

            try {
                // Save to Firestore
                const docRef = await addDoc(collection(db, "reports"), {
                    issueType: issueType,
                    location: location,
                    description: description,
                    status: "Pending",
                    timestamp: serverTimestamp()
                });

                console.log("Document written with ID: ", docRef.id);
                alert('Success! Your report has been submitted. Tracking ID: ' + docRef.id);
                reportForm.reset();
                
                // Reset file upload zone visualization if exists
                const uploadPara = document.querySelector('.upload-zone p');
                const uploadIcon = document.querySelector('.upload-zone i');
                if (uploadPara) uploadPara.textContent = 'Click to upload or drag & drop';
                if (uploadIcon) uploadIcon.className = 'bi bi-cloud-arrow-up display-6 text-primary mb-2';

            } catch (error) {
                console.error("Error adding document: ", error);
                alert("Error submitting report. Please try again.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // 4. File Upload Visualization
    const uploadZone = document.querySelector('.upload-zone');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadZone && fileInput) {
        uploadZone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const fileName = this.files[0].name;
                uploadZone.querySelector('p').textContent = 'Selected: ' + fileName;
                uploadZone.querySelector('i').className = 'bi bi-file-earmark-check-fill display-6 text-success mb-2';
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
                uploadZone.querySelector('p').textContent = 'Dropped: ' + fileName;
                uploadZone.querySelector('i').className = 'bi bi-file-earmark-check-fill display-6 text-success mb-2';
            }
        });
    }

    // 5. Smooth Scroll for all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Close navbar on mobile after click
                const navbarCollapse = document.getElementById('navbarContent');
                if (navbarCollapse) {
                    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse, { toggle: false });
                    bsCollapse.hide();
                }
            }
        });
    });

});
