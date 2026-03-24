import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);

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
            const locationEl = document.getElementById('reportLocation');
            const descEl = reportForm.querySelector('textarea');
            const currentFileInput = document.getElementById('fileInput');
            
            if (!selectEl || !locationEl || !descEl) {
                console.error("Form elements missing!");
                alert("Critical Error: Form structure has changed. Please refresh the page.");
                return;
            }

            const issueType = selectEl.value;
            const location = locationEl.value;
            const description = descEl.value;
            const evidenceFile = currentFileInput ? currentFileInput.files[0] : null;

            if (!issueType || !location || !description) {
                alert('Please fill in all the required fields!');
                return;
            }

            console.log("Submitting report for:", issueType);

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
                const currentUser = auth.currentUser;
                await addDoc(collection(db, "reports"), {
                    trackingId,
                    issueType,
                    location,
                    description,
                    evidenceUrl,
                    status: 'Pending',
                    timestamp: serverTimestamp(),
                    userId: currentUser ? currentUser.uid : 'anonymous',
                    userName: currentUser ? currentUser.displayName : 'Guest'
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

    // 4. Authentication Logic
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginMode = document.getElementById('loginMode');
    const signupMode = document.getElementById('signupMode');
    const userAccount = document.getElementById('userAccount');
    const loginNavItem = document.getElementById('loginNavItem');
    const navUserName = document.getElementById('navUserName');
    const logoutBtn = document.getElementById('logoutBtn');

    // Toggle between Login and Signup
    if (loginMode && signupMode) {
        loginMode.addEventListener('change', () => {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        });
        signupMode.addEventListener('change', () => {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        });
    }

    // Handle Signup
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const pass = document.getElementById('signupPass').value;
            const submitBtn = signupForm.querySelector('button[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.innerText = "Creating Account...";
                
                const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                const user = userCredential.user;

                // Update Profile Name
                await updateProfile(user, { displayName: name });

                // Save to Firestore users collection
                await setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: email,
                    createdAt: serverTimestamp()
                });

                alert("Account created successfully!");
                bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
                signupForm.reset();
            } catch (error) {
                alert("Signup Error: " + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Register Now";
            }
        });
    }

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPass').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.innerText = "Signing In...";
                await signInWithEmailAndPassword(auth, email, pass);
                bootstrap.Modal.getInstance(document.getElementById('authModal')).hide();
                loginForm.reset();
            } catch (error) {
                alert("Login Error: " + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Sign In";
            }
        });
    }

    // Handle Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                alert("Logged out successfully");
            });
        });
    }

    // Track Auth State
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            loginNavItem.classList.add('d-none');
            userAccount.classList.remove('d-none');
            navUserName.innerText = user.displayName || 'User';
        } else {
            // User is signed out
            loginNavItem.classList.remove('d-none');
            userAccount.classList.add('d-none');
        }
    });

    // 5. Smooth Scroll
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

    // 5. Real-time Reports Fetching
    const issueGrid = document.getElementById('issue-grid');
    if (issueGrid) {
        // Query last 6 reports ordered by timestamp
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"), limit(6));
        
        onSnapshot(q, (snapshot) => {
            issueGrid.innerHTML = ''; // Clear existing static content
            
            if (snapshot.empty) {
                issueGrid.innerHTML = '<div class="col-12 text-center text-muted py-5"><p>No reports found. Be the first to report an issue!</p></div>';
                return;
            }

            snapshot.forEach((doc) => {
                const report = doc.data();
                const date = report.timestamp ? new Date(report.timestamp.seconds * 1000).toLocaleDateString() : 'Just now';
                const statusClass = report.status === 'Urgent' ? 'badge-urgent' : (report.status === 'In Progress' ? 'badge-progress' : 'badge-pending');
                const imageUrl = report.evidenceUrl || 'assets/placeholder-issue.png'; // Fallback image

                const cardHtml = `
                    <div class="col-lg-4 col-md-6" data-aos="fade-up">
                        <div class="card border-0 shadow-lg h-100 rounded-4 overflow-hidden shadow-hover bg-white">
                            <div class="ratio ratio-16x9">
                                <img src="${imageUrl}" class="card-img-top object-fit-cover" alt="${report.issueType}" onerror="this.src='https://placehold.co/600x400/222831/948979?text=City+Report'">
                            </div>
                            <div class="card-body p-4">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <span class="badge ${statusClass} px-3 py-2 rounded-pill">${report.status || 'Pending'}</span>
                                    <small class="text-muted"><i class="bi bi-clock me-1"></i>${date}</small>
                                </div>
                                <h6 class="text-primary small fw-bold mb-1">ID: ${report.trackingId}</h6>
                                <h5 class="fw-bold mb-3">${report.issueType}</h5>
                                <p class="text-muted small mb-4 text-truncate-3">${report.description}</p>
                                <div class="pt-3 border-top">
                                    <div class="mb-2 d-flex align-items-center">
                                        <i class="bi bi-geo-alt-fill text-primary me-2"></i>
                                        <span class="small fw-semibold text-truncate">${report.location}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                issueGrid.insertAdjacentHTML('beforeend', cardHtml);
            });
            
            // Re-initialize AOS for new elements
            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
        });
    }

    // Handle Forgot Password
    const forgotPassBtn = document.getElementById('forgotPassBtn');
    if (forgotPassBtn) {
        forgotPassBtn.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            if (!email) {
                alert("Please enter your email above to receive a reset link.");
                return;
            }
            try {
                await sendPasswordResetEmail(auth, email);
                alert("Password reset email sent! Check your inbox.");
            } catch (error) {
                alert("Error: " + error.message);
            }
        });
    }

    // 6. Auto-Location Detection
    const detectBtn = document.getElementById('detectLocationBtn');
    const locationInput = document.getElementById('reportLocation');
    const locationStatus = document.getElementById('locationStatus');

    if (detectBtn && locationInput) {
        detectBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert("Geolocation is not supported by your browser.");
                return;
            }

            locationStatus.innerText = "📍 Detecting location...";
            detectBtn.disabled = true;

            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    // Using free Nominatim (OpenStreetMap) Reverse Geocoding API
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
                    const data = await response.json();
                    
                    if (data && data.display_name) {
                        const addr = data.address;
                        const simpleAddress = [
                            addr.road, 
                            addr.suburb || addr.neighbourhood, 
                            addr.city || addr.town || addr.village
                        ].filter(Boolean).join(", ");
                        
                        locationInput.value = simpleAddress || data.display_name;
                        locationStatus.innerText = "✅ Location detected successfully!";
                    } else {
                        locationInput.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                        locationStatus.innerText = "⚠️ Address not found, using coordinates.";
                    }
                } catch (err) {
                    console.error("Geocoding failed:", err);
                    locationInput.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    locationStatus.innerText = "❌ Geocoding failed, using coordinates.";
                } finally {
                    detectBtn.disabled = false;
                }

            }, (error) => {
                let msg = "Location error.";
                if (error.code === 1) msg = "Please allow location access in your browser.";
                else if (error.code === 2) msg = "Location unavailable.";
                else msg = "Timeout or error.";
                
                locationStatus.innerText = "❌ " + msg;
                detectBtn.disabled = false;
            }, { timeout: 10000 });
        });
    }

});
