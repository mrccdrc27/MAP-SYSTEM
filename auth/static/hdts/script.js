// ==================== Form State Management ====================
let formState = {
    firstName: '',
    lastName: '',
    companyId: '',
    department: '',
    email: '',
    password: '',
    password2: '',
    profilePicture: false,
    termsAgreed: false,
    termsRead: false,  // Track if user has actually read the T&C
    croppedImageUrl: null,  // Store cropped image URL
    tempImageUrl: null  // Store temporary image before cropping
};

// ==================== Image Cropper Management ====================
let cropper = null;
let currentFileInput = null;
let isProgrammaticFileChange = false;

function openCropperModal(file) {
    // Check if Cropper library is loaded
    if (typeof Cropper === 'undefined') {
        alert('Image cropper library failed to load. Please refresh the page.');
        return;
    }

    const cropperModal = document.getElementById('cropperModal');
    const cropperImage = document.getElementById('cropperImage');
    
    if (!cropperModal || !cropperImage) {
        alert('Cropper interface not found. Please refresh the page.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        cropperImage.src = event.target.result;
        
        // Destroy existing cropper if it exists
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        
        try {
            // Wait for image to load before initializing cropper
            cropperImage.onload = function() {
                // Initialize new cropper with 1:1 aspect ratio
                cropper = new Cropper(cropperImage, {
                    aspectRatio: 1,
                    viewMode: 1,
                    autoCropArea: 1,
                    responsive: true,
                    restore: true,
                    guides: true,
                    center: true,
                    highlight: true,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: true,
                    crop: function() {
                        // Update preview on every crop change - with small delay to ensure canvas is ready
                        setTimeout(() => {
                            updateCropperPreview();
                        }, 50);
                    }
                });
                
                // Initial preview update - with delay to ensure it's ready
                setTimeout(() => {
                    updateCropperPreview();
                }, 100);
                
                cropperModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            };
            
            cropperImage.onerror = function() {
                alert('Error loading image. Please try again.');
            };
        } catch (error) {
            alert('Error initializing image cropper. Please try again.');
        }
    };
    
    reader.onerror = function() {
        alert('Error reading file. Please try again.');
    };
    
    reader.readAsDataURL(file);
}

function closeCropperModal() {
    const cropperModal = document.getElementById('cropperModal');
    cropperModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

function updateCropperPreview() {
    if (!cropper) {
        return;
    }
    
    try {
        const canvas = cropper.getCroppedCanvas({
            maxWidth: 300,
            maxHeight: 300,
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        
        if (!canvas) {
            return;
        }
        
        const previewContainer = document.getElementById('previewContainer');
        if (!previewContainer) {
            return;
        }
        
        previewContainer.innerHTML = '';
        
        try {
            const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            const img = document.createElement('img');
            img.src = imgDataUrl;
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            previewContainer.appendChild(img);
        } catch (dataUrlError) {
        }
    } catch (error) {
    }
}

function saveCropperImage() {
    if (!cropper || !currentFileInput) {
        return;
    }
    
    try {
        const canvas = cropper.getCroppedCanvas();
        if (!canvas) {
            alert('Error cropping image. Please try again.');
            return;
        }
        
        // Get the cropped image as data URL for preview
        const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        canvas.toBlob(function(blob) {
            try {
                // Create a new File object from the blob
                const croppedFile = new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
                
                // Create a DataTransfer object to set the file
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(croppedFile);
                
                // Set flag to prevent reopening cropper modal
                isProgrammaticFileChange = true;
                
                // Store cropped image URL for the profile preview
                formState.croppedImageUrl = croppedImageUrl;
                
                // Now set the file
                currentFileInput.files = dataTransfer.files;
                
                // Trigger change event to update validation
                const event = new Event('change', { bubbles: true });
                currentFileInput.dispatchEvent(event);
                
                // Reset flag after event is processed
                setTimeout(() => {
                    isProgrammaticFileChange = false;
                }, 0);
                
                closeCropperModal();
            } catch (innerError) {
                alert('Error processing cropped image. Please try again.');
                isProgrammaticFileChange = false;
            }
        }, 'image/jpeg', 0.95);
    } catch (error) {
        alert('Error cropping image. Please try again.');
        isProgrammaticFileChange = false;
    }
}

// ==================== Profile Preview Management ====================
function updateProfilePreview() {
    // Update form field values
    const firstNameInput = document.querySelector('input[name="first_name"]');
    const lastNameInput = document.querySelector('input[name="last_name"]');
    const middleNameInput = document.querySelector('input[name="middle_name"]');
    const suffixInput = document.querySelector('input[name="suffix"]');
    const companyIdInput = document.querySelector('input[name="company_id"]');
    const departmentSelect = document.querySelector('select[name="department"]');

    // Build full name: first name, middle name (optional), last name, suffix (optional) - all caps
    const firstName = (firstNameInput?.value || '').toUpperCase();
    const middleName = (middleNameInput?.value || '').toUpperCase();
    const lastName = (lastNameInput?.value || '').toUpperCase();
    const suffix = (suffixInput?.value || '').toUpperCase();

    // Combine parts, filtering out empty values
    let fullName = firstName;
    if (middleName) {
        fullName += ' ' + middleName;
    }
    fullName += (lastName ? ' ' + lastName : '');
    if (suffix) {
        fullName += ' ' + suffix;
    }
    fullName = fullName.trim() || '-';

    // Update preview with current values or placeholder
    document.getElementById('previewFullName').textContent = fullName;
    document.getElementById('previewCompanyId').textContent = companyIdInput?.value ? 'MA' + companyIdInput.value : '-';
    document.getElementById('previewDepartment').textContent = departmentSelect?.value || '-';

    // Update profile picture from stored cropped image
    const profilePreviewImg = document.getElementById('profilePreviewImg');
    
    if (formState.croppedImageUrl) {
        // Use the stored cropped image (after user saves crop)
        profilePreviewImg.src = formState.croppedImageUrl;
    } else if (formState.tempImageUrl) {
        // Use the temporary image (before cropping)
        profilePreviewImg.src = formState.tempImageUrl;
    } else {
        // Show blank placeholder
        profilePreviewImg.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" fill="%23e9ecef"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Arial" font-size="11" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
    }
}

function showProfilePreview() {
    const profilePreviewContainer = document.getElementById('profilePreviewContainer');
    if (profilePreviewContainer) {
        profilePreviewContainer.style.display = 'block';
        updateProfilePreview();
    }
}

function hideProfilePreview() {
    const profilePreviewContainer = document.getElementById('profilePreviewContainer');
    if (profilePreviewContainer) {
        profilePreviewContainer.style.display = 'none';
    }
}

// Listen for real-time form field changes
document.addEventListener('DOMContentLoaded', function() {
    const firstNameInput = document.querySelector('input[name="first_name"]');
    const lastNameInput = document.querySelector('input[name="last_name"]');
    const middleNameInput = document.querySelector('input[name="middle_name"]');
    const suffixInput = document.querySelector('input[name="suffix"]');
    const companyIdInput = document.querySelector('input[name="company_id"]');
    const departmentSelect = document.querySelector('select[name="department"]');

    // Add event listeners for real-time updates when preview is visible
    const updateIfPreviewVisible = () => {
        const previewContainer = document.getElementById('profilePreviewContainer');
        if (previewContainer && previewContainer.style.display !== 'none') {
            updateProfilePreview();
        }
    };

    if (firstNameInput) firstNameInput.addEventListener('input', updateIfPreviewVisible);
    if (lastNameInput) lastNameInput.addEventListener('input', updateIfPreviewVisible);
    if (middleNameInput) middleNameInput.addEventListener('input', updateIfPreviewVisible);
    if (suffixInput) suffixInput.addEventListener('input', updateIfPreviewVisible);
    if (companyIdInput) companyIdInput.addEventListener('input', updateIfPreviewVisible);
    if (departmentSelect) departmentSelect.addEventListener('change', updateIfPreviewVisible);
});

// ==================== Modal Management ====================
let currentModalStep = 'privacy';

function showModal(step = 'privacy') {
    currentModalStep = step;
    updateModalContent();
    document.getElementById('policyModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    // If user is trying to close without reading T&C, warn them
    if (currentModalStep === 'terms' && !formState.termsRead) {
        alert('Please read the Terms and Conditions before proceeding.');
        return;
    }
    
    document.getElementById('policyModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentModalStep = 'privacy';
}

function updateModalContent() {
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const backBtn = document.getElementById('backBtn');
    const agreeBtn = document.getElementById('agreeBtn');
    const privacyStep = document.getElementById('privacyStep');
    const termsStep = document.getElementById('termsStep');

    if (currentModalStep === 'privacy') {
        modalTitle.textContent = 'Privacy Policy';
        modalContent.innerHTML = getPrivacyPolicyContent();
        backBtn.style.display = 'none';
        agreeBtn.textContent = '❯ Next';
        privacyStep.classList.add('active');
        termsStep.classList.remove('active');
    } else {
        modalTitle.textContent = 'Terms and Conditions';
        modalContent.innerHTML = getTermsConditionsContent();
        backBtn.style.display = 'inline-block';
        agreeBtn.innerHTML = '<i class="fas fa-check"></i>&nbsp;I Agree';
        privacyStep.classList.remove('active');
        termsStep.classList.add('active');
    }

    // Scroll to top of modal
    modalContent.scrollTop = 0;
}

function handleAgree() {
    if (currentModalStep === 'privacy') {
        currentModalStep = 'terms';
        updateModalContent();
        document.getElementById('stepIndicator').style.display = 'flex';
    } else {
        // User has agreed to both and read T&C
        document.getElementById('termsCheckbox').checked = true;
        formState.termsAgreed = true;
        formState.termsRead = true;
        validateForm();
        closeModal();
    }
}

function goBackStep() {
    if (currentModalStep === 'terms') {
        currentModalStep = 'privacy';
        updateModalContent();
    }
}

// ==================== Password Visibility Toggle ====================
function togglePasswordVisibility(toggleIcon, inputId) {
    const input = document.getElementById(inputId);
    const icon = toggleIcon.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    } else {
        input.type = 'password';
        if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    }
}

// ==================== Password Matching Validation ====================
function validatePasswordMatch() {
    const passwordInput = document.querySelector('input[name="password"]');
    const password2Input = document.querySelector('input[name="password2"]');
    const password2Fieldset = password2Input?.parentElement?.parentElement;

    if (!passwordInput || !password2Input || !password2Fieldset) return;

    const password = passwordInput.value;
    const password2 = password2Input.value;

    // Remove any existing error message
    const existingError = password2Fieldset.querySelector('.password-match-error');
    if (existingError) {
        existingError.remove();
    }

    // Check if passwords match (only if both fields have content)
    if (password && password2 && password !== password2) {
        const errorMsg = document.createElement('span');
        errorMsg.className = 'error-msg password-match-error';
        errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i>&nbsp;Passwords do not match';
        password2Fieldset.appendChild(errorMsg);
        password2Input.style.borderColor = 'var(--warning-text)';
        return false;
    } else if (password && password2 && password === password2) {
        password2Input.style.borderColor = 'var(--border-color)';
        return true;
    }

    password2Input.style.borderColor = 'var(--border-color)';
    return true;
}

// ==================== Form Validation ====================
function validateForm() {
    const submitBtn = document.querySelector('.submit-button');
    const lastNameInput = document.querySelector('input[name="last_name"]');
    const firstNameInput = document.querySelector('input[name="first_name"]');
    const companyIdInput = document.querySelector('input[name="company_id"]');
    const departmentSelect = document.querySelector('select[name="department"]');
    const emailInput = document.querySelector('input[name="email"]');
    const passwordInput = document.querySelector('input[name="password"]');
    const password2Input = document.querySelector('input[name="password2"]');
    const termsCheckbox = document.getElementById('termsCheckbox');
    const fileInput = document.querySelector('input[type="file"]');

    // Update form state
    formState.firstName = firstNameInput?.value?.trim() || '';
    formState.lastName = lastNameInput?.value?.trim() || '';
    formState.companyId = companyIdInput?.value?.trim() || '';
    formState.department = departmentSelect?.value?.trim() || '';
    formState.email = emailInput?.value?.trim() || '';
    formState.password = passwordInput?.value || '';
    formState.password2 = password2Input?.value || '';
    formState.termsAgreed = termsCheckbox?.checked || false;
    formState.profilePicture = fileInput?.files?.length > 0 || false;

    // Check if password and confirm password match
    const passwordsMatch = validatePasswordMatch();

    // Determine if form is valid
    const isFormValid =
        formState.firstName &&
        formState.lastName &&
        formState.companyId &&
        formState.companyId.length === 4 &&
        formState.department &&
        formState.email &&
        formState.password &&
        formState.password2 &&
        passwordsMatch &&
        formState.profilePicture &&
        formState.termsAgreed;

    // Enable/disable submit button
    if (isFormValid) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    } else {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    }
}

// ==================== Initialize on DOM Ready ====================
document.addEventListener('DOMContentLoaded', function() {
    // Initial form validation
    validateForm();

    // ==================== Password Toggle Setup ====================
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    
    passwordInputs.forEach(input => {
        // Find the password-toggle span within the parent container
        const container = input.parentElement;
        let toggle = container.querySelector('.password-toggle');
        
        // Safety check: if multiple toggles exist, remove duplicates and keep only one
        const allToggles = container.querySelectorAll('.password-toggle');
        if (allToggles.length > 1) {
            for (let i = 1; i < allToggles.length; i++) {
                allToggles[i].remove();
            }
            toggle = container.querySelector('.password-toggle');
        }
        
        if (toggle) {
            // Show/hide toggle based on input value
            toggle.style.visibility = input.value ? 'visible' : 'hidden';
            
            // Add input listener to show/hide toggle
            input.addEventListener('input', function() {
                toggle.style.visibility = this.value ? 'visible' : 'hidden';
                validateForm();
            });
        }
    });

    // Add listeners to all required fields
    const requiredInputs = document.querySelectorAll(
        'input[name="first_name"], input[name="last_name"], input[name="company_id"], ' +
        'input[name="email"], select[name="department"], input[type="file"]'
    );

    requiredInputs.forEach(input => {
        input.addEventListener('change', validateForm);
        input.addEventListener('input', validateForm);
    });

    // Add listener to terms checkbox - only allow clicking if terms were read
    const termsCheckbox = document.getElementById('termsCheckbox');
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', function(e) {
            // If user tries to check the box without reading T&C, uncheck it
            if (e.target.checked && !formState.termsRead) {
                e.target.checked = false;
                alert('You must read and agree to the Privacy Policy and Terms and Conditions.');
            }
            validateForm();
        });
    }
    
    // Prevent clicking the terms link from opening the modal if it needs to be clicked
    const privacyLink = document.querySelector('span.link[onclick="showModal(\'privacy\')"]');
    const termsLink = document.querySelector('span.link[onclick="showModal(\'terms\')"]');
    
    if (privacyLink) {
        privacyLink.addEventListener('click', function(e) {
            e.preventDefault();
            showModal('privacy');
        });
    }
    
    if (termsLink) {
        termsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showModal('terms');
        });
    }

    // ==================== File Upload Preview ====================
    const fileInput = document.querySelector('input[type="file"]');
    const fileLabel = document.querySelector('.file-upload-label');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && !isProgrammaticFileChange) {
                // Store reference for cropper
                currentFileInput = this;
                
                // Open cropper modal
                openCropperModal(file);
                
                // Update button text and color
                fileLabel.innerHTML = '<i class="fas fa-check-circle"></i>&nbsp;&nbsp;' + file.name;
                fileLabel.classList.add('has-file');
                
                // Show the inline profile preview with the original image temporarily
                const reader = new FileReader();
                reader.onload = function(event) {
                    // Store temporary preview image in formState for display before cropping
                    formState.tempImageUrl = event.target.result;
                    // Show the inline profile preview
                    showProfilePreview();
                };
                reader.readAsDataURL(file);
            } else if (!isProgrammaticFileChange) {
                fileLabel.innerHTML = '<i class="fas fa-cloud-upload-alt"></i>&nbsp;&nbsp;Choose File';
                fileLabel.classList.remove('has-file');
                // Clear temporary and cropped images
                formState.tempImageUrl = null;
                formState.croppedImageUrl = null;
                // Hide the inline profile preview
                hideProfilePreview();
            } else {
                // For programmatic changes, preview is already updated in saveCropperImage
                if (file) {
                    fileLabel.innerHTML = '<i class="fas fa-check-circle"></i>&nbsp;&nbsp;' + file.name;
                    fileLabel.classList.add('has-file');
                    // Show the inline profile preview
                    showProfilePreview();
                }
            }
            validateForm();
        });
    }

    // ==================== Company ID Validation ====================
    const companyIdInput = document.querySelector('input[name="company_id"]');
    if (companyIdInput) {
        companyIdInput.addEventListener('input', function(e) {
            // Only allow digits, max 4 characters
            this.value = this.value.replace(/[^\d]/g, '').slice(0, 4);
            validateForm();
        });

        companyIdInput.addEventListener('paste', function(e) {
            const pasted = e.clipboardData.getData('text');
            if (!/^\d+$/.test(pasted)) {
                e.preventDefault();
            }
        });

        // ==================== Form Submission ====================
        const registrationForm = document.querySelector('form');
        if (registrationForm) {
            registrationForm.addEventListener('submit', function(e) {
                // Validate passwords match one more time before submission
                if (!validatePasswordMatch()) {
                    e.preventDefault();
                    return;
                }
                
                // Ensure user has read T&C
                if (!formState.termsRead) {
                    e.preventDefault();
                    alert('You must read and agree to the Terms and Conditions.');
                    return;
                }

                // Prepend "MA" to company_id if it doesn't already have it
                if (companyIdInput.value && companyIdInput.value.trim() !== '') {
                    if (!companyIdInput.value.startsWith('MA')) {
                        companyIdInput.value = 'MA' + companyIdInput.value;
                    }
                }
            });
        }
    }

    // ==================== Modal Overlay Click Close ====================
    const policyModal = document.getElementById('policyModal');
    const cropperModal = document.getElementById('cropperModal');
    
    if (policyModal) {
        policyModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
    
    if (cropperModal) {
        cropperModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeCropperModal();
            }
        });
    }
});

// ==================== Modal Close on ESC ====================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const policyModal = document.getElementById('policyModal');
        const cropperModal = document.getElementById('cropperModal');
        
        if (policyModal && policyModal.classList.contains('active')) {
            closeModal();
        }
        if (cropperModal && cropperModal.classList.contains('active')) {
            closeCropperModal();
        }
    }
});

// ==================== Privacy Policy & Terms Content ====================
function getPrivacyPolicyContent() {
    return `
        <h3>Privacy Policy</h3>
        <p>This Privacy Policy outlines how the SmartSupport: AI-Powered Helpdesk Ticketing System collects, uses, stores, and protects the personal data of users who access and use the System.</p>

        <h3>1. Information We Collect</h3>
        <p>When you use the System, we may collect the following types of information:</p>
        <ul>
            <li><strong>Personal Information:</strong> Name, email address, phone number, company affiliation, and job title.</li>
            <li><strong>Account Information:</strong> Username, password, security questions, and account preferences.</li>
            <li><strong>Usage Data:</strong> Information about how you interact with the System, including tickets created, viewed, and modified.</li>
            <li><strong>Technical Data:</strong> IP address, browser type, device information, and log data.</li>
            <li><strong>Communication Data:</strong> Messages, attachments, and feedback provided through the System.</li>
        </ul>

        <h3>2. How We Use Your Information</h3>
        <p>We use the collected information for the following purposes:</p>
        <ul>
            <li>To create and maintain your user account</li>
            <li>To provide and improve the System's functionality</li>
            <li>To process and respond to support tickets</li>
            <li>To communicate with you about system updates and changes</li>
            <li>To analyze usage patterns and improve user experience</li>
            <li>To ensure system security and prevent fraud</li>
        </ul>

        <h3>3. Data Security</h3>
        <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and access controls.</p>

        <h3>4. Your Rights</h3>
        <p>You have the right to access, correct, or delete your personal information. To exercise these rights, please contact us through the System or at the provided contact information.</p>

        <p style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #eee; font-size: 0.9rem; color: #999;">
            <i class="fas fa-scroll"></i>&nbsp;Last updated: December 2024
        </p>
    `;
}

function getTermsConditionsContent() {
    return `
        <h3>Terms and Conditions</h3>
        <p>These Terms and Conditions govern your use of the SmartSupport: AI-Powered Helpdesk Ticketing System. By accessing and using the System, you accept and agree to be bound by the terms and provision of this agreement.</p>

        <h3>1. Use License</h3>
        <p>Permission is granted to temporarily download one copy of the materials (information or software) on the SmartSupport System for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
        <ul>
            <li>Modifying or copying the materials</li>
            <li>Using the materials for any commercial purpose or for any public display</li>
            <li>Attempting to decompile or reverse engineer any software contained on the System</li>
            <li>Removing any copyright or other proprietary notations from the materials</li>
            <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
        </ul>

        <h3>2. Disclaimer</h3>
        <p>The materials on the SmartSupport System are provided on an 'as is' basis. The System makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>

        <h3>3. Limitations</h3>
        <p>In no event shall the SmartSupport System or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the System, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.</p>

        <h3>4. Accuracy of Materials</h3>
        <p>The materials appearing on the SmartSupport System could include technical, typographical, or photographic errors. The System does not warrant that any of the materials on its System are accurate, complete, or current. The System may make changes to the materials contained on its System at any time without notice.</p>

        <h3>5. User Conduct</h3>
        <p>Users agree not to engage in any conduct that restricts or inhibits anyone's use or enjoyment of the System, or which, as determined by the System, may harm the System or users of the System, or expose them to liability.</p>

        <p style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #eee; font-size: 0.9rem; color: #999;">
            <i class="fas fa-gavel"></i>&nbsp;Last updated: December 2024
        </p>
    `;
}

// ==================== Modal Close on ESC ====================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ==================== Modal Overlay Click Close ====================
document.getElementById('policyModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// ==================== Privacy Policy & Terms Content ====================
function getPrivacyPolicyContent() {
    return `
        <h3>Privacy Policy</h3>
        <p>This Privacy Policy outlines how the SmartSupport: AI-Powered Helpdesk Ticketing System collects, uses, stores, and protects the personal data of users who access and use the System.</p>

        <h3>1. Information We Collect</h3>
        <p>When you use the System, we may collect the following types of information:</p>
        <ul>
            <li><strong>Personal Information:</strong> Name, email address, phone number, company affiliation, and job title.</li>
            <li><strong>Account Information:</strong> Username, password, security questions, and account preferences.</li>
            <li><strong>Usage Data:</strong> Information about how you interact with the System, including tickets created, viewed, and modified.</li>
            <li><strong>Technical Data:</strong> IP address, browser type, device information, and log data.</li>
            <li><strong>Communication Data:</strong> Messages, attachments, and feedback provided through the System.</li>
        </ul>

        <h3>2. How We Use Your Information</h3>
        <p>We use the collected information for the following purposes:</p>
        <ul>
            <li>To create and maintain your user account</li>
            <li>To provide and improve the System's functionality</li>
            <li>To process and respond to support tickets</li>
            <li>To communicate with you about system updates and changes</li>
            <li>To analyze usage patterns and improve user experience</li>
            <li>To ensure system security and prevent fraud</li>
        </ul>

        <h3>3. Data Security</h3>
        <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and access controls.</p>

        <h3>4. Your Rights</h3>
        <p>You have the right to access, correct, or delete your personal information. To exercise these rights, please contact us through the System or at the provided contact information.</p>

        <p style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #eee; font-size: 0.9rem; color: #999;">
            <i class="fas fa-scroll"></i>&nbsp;Last updated: December 2024
        </p>
    `;
}

function getTermsConditionsContent() {
    return `
        <h3>Terms and Conditions</h3>
        <p>These Terms and Conditions govern your use of the SmartSupport: AI-Powered Helpdesk Ticketing System. By accessing and using the System, you accept and agree to be bound by the terms and provision of this agreement.</p>

        <h3>1. Use License</h3>
        <p>Permission is granted to temporarily download one copy of the materials (information or software) on the SmartSupport System for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
        <ul>
            <li>Modifying or copying the materials</li>
            <li>Using the materials for any commercial purpose or for any public display</li>
            <li>Attempting to decompile or reverse engineer any software contained on the System</li>
            <li>Removing any copyright or other proprietary notations from the materials</li>
            <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
        </ul>

        <h3>2. Disclaimer</h3>
        <p>The materials on the SmartSupport System are provided on an 'as is' basis. The System makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>

        <h3>3. Limitations</h3>
        <p>In no event shall the SmartSupport System or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the System, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.</p>

        <h3>4. Accuracy of Materials</h3>
        <p>The materials appearing on the SmartSupport System could include technical, typographical, or photographic errors. The System does not warrant that any of the materials on its System are accurate, complete, or current. The System may make changes to the materials contained on its System at any time without notice.</p>

        <h3>5. User Conduct</h3>
        <p>Users agree not to engage in any conduct that restricts or inhibits anyone's use or enjoyment of the System, or which, as determined by the System, may harm the System or users of the System, or expose them to liability.</p>

        <p style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #eee; font-size: 0.9rem; color: #999;">
            <i class="fas fa-gavel"></i>&nbsp;Last updated: December 2024
        </p>
    `;
}
