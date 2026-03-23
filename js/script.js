document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Navbar Scroll Effect
    const mainNav = document.getElementById('mainNav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            mainNav.classList.add('navbar-scrolled');
        } else {
            mainNav.classList.remove('navbar-scrolled');
        }
    });

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

    // 3. Report Form Submission
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get button and show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';

            // Simulate API call
            setTimeout(() => {
                alert('Success! Your report has been submitted. Tracking ID: SC-' + Math.floor(Math.random() * 900000 + 100000));
                reportForm.reset();
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }, 2000);
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
                if (navbarCollapse.classList.contains('show')) {
                    const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                    bsCollapse.hide();
                }
            }
        });
    });

});
