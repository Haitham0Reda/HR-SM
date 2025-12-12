// Generate a random temporary password
const generateTempPassword = (userId) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const specialChars = '@#$%';
    let password = '';
    
    // Add 8 random characters
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Add 2 numbers
    password += Math.floor(Math.random() * 90 + 10);
    
    // Add 1 special character
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Generate Employee Credentials PDF
export const generateUserCredentialPDF = (user, tempPassword = null) => {
    // Generate a temporary password if not provided
    const displayPassword = tempPassword || generateTempPassword(user._id);
    try {
        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=1000');
        
        if (!printWindow) {
            throw new Error('Popup blocked. Please allow popups for this site.');
        }

        // Generate the HTML content for the credential document
        const credentialHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Employee Credentials - ${user.personalInfo?.fullName || user.username}</title>
                <style>
                    * { 
                        margin: 0; 
                        padding: 0; 
                        box-sizing: border-box; 
                    }
                    
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: #f5f5f5;
                        padding: 20px;
                        color: #333;
                    }
                    
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                        background: white;
                        padding: 25px 30px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 10px;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #1976d2;
                    }
                    
                    .logo {
                        width: 120px;
                        height: 30px;
                        margin: 0 auto 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .logo svg {
                        width: 100%;
                        height: 100%;
                    }
                    
                    .company-name {
                        font-size: 20px;
                        font-weight: bold;
                        color: #1976d2;
                        margin-bottom: 3px;
                    }
                    
                    .company-subtitle {
                        font-size: 12px;
                        color: #666;
                    }
                    
                    .title {
                        text-align: center;
                        margin-bottom: 6px;
                    }
                    
                    .title h1 {
                        font-size: 22px;
                        color: #1976d2;
                        margin-bottom: 3px;
                    }
                    
                    .title p {
                        font-size: 12px;
                        color: #999;
                    }
                    
                    .section {
                        margin-bottom: 12px;
                    }
                    
                    .section-title {
                        font-size: 15px;
                        color: #1976d2;
                        font-weight: 600;
                        margin-bottom: 8px;
                        padding-bottom: 4px;
                        border-bottom: 2px solid #e0e0e0;
                    }
                    
                    .info-row {
                        display: flex;
                        padding: 6px 0;
                        border-bottom: 1px solid #f0f0f0;
                    }
                    
                    .info-row:last-child {
                        border-bottom: none;
                    }
                    
                    .info-label {
                        font-weight: 600;
                        color: #555;
                        width: 150px;
                        flex-shrink: 0;
                        font-size: 14px;
                    }
                    
                    .info-value {
                        color: #333;
                        flex: 1;
                        font-size: 14px;
                    }
                    
                    .credentials-box {
                        background: #f8f9fa;
                        border: 2px solid #1976d2;
                        border-radius: 6px;
                        padding: 12px;
                        margin: 10px 0;
                    }
                    
                    .credential-item {
                        margin-bottom: 8px;
                    }
                    
                    .credential-item:last-child {
                        margin-bottom: 0;
                    }
                    
                    .credential-label {
                        font-size: 11px;
                        color: #666;
                        font-weight: 600;
                        text-transform: uppercase;
                        margin-bottom: 3px;
                    }
                    
                    .credential-value {
                        font-size: 14px;
                        color: #333;
                        font-weight: 500;
                        font-family: 'Courier New', monospace;
                        background: white;
                        padding: 6px 10px;
                        border-radius: 4px;
                        border: 1px solid #ddd;
                    }
                    
                    .note {
                        font-size: 11px;
                        color: #666;
                        font-style: italic;
                        margin-top: 5px;
                    }
                    
                    .info-box {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 10px;
                        margin: 10px 0;
                        border-radius: 4px;
                    }
                    
                    .info-box ul {
                        margin-left: 18px;
                        margin-top: 3px;
                    }
                    
                    .info-box li {
                        margin-bottom: 3px;
                        line-height: 1.3;
                        font-size: 11px;
                    }
                    
                    .links-section {
                        background: #e3f2fd;
                        border-left: 4px solid #1976d2;
                        padding: 10px;
                        margin: 10px 0;
                        border-radius: 4px;
                    }
                    
                    .link-item {
                        margin-bottom: 6px;
                    }
                    
                    .link-item:last-child {
                        margin-bottom: 0;
                    }
                    
                    .link-label {
                        font-weight: 600;
                        color: #1976d2;
                        margin-bottom: 2px;
                        font-size: 13px;
                    }
                    
                    .link-url {
                        color: #666;
                        font-size: 12px;
                        word-break: break-all;
                    }
                    
                    .footer {
                        margin-top: 12px;
                        padding-top: 8px;
                        border-top: 2px solid #e0e0e0;
                        text-align: center;
                        color: #666;
                        font-size: 10px;
                    }
                    
                    .footer p {
                        margin-bottom: 3px;
                    }
                    
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    
                    @media print {
                        body { 
                            background: white; 
                            padding: 0;
                            margin: 0;
                        }
                        .container { 
                            box-shadow: none;
                            padding: 15px 20px;
                            page-break-after: avoid;
                            page-break-inside: avoid;
                        }
                        .section {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <!-- Header with Logo -->
                    <div class="header">
                        <div class="logo">
                            <svg focusable="false" aria-hidden="true" viewBox="0 0 86 19" width="86" height="19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#B4C0D3" d="m.787 12.567 6.055-2.675 3.485 2.006.704 6.583-4.295-.035.634-4.577-.74-.422-3.625 2.817-2.218-3.697Z"></path>
                                <path fill="#00D3AB" d="m10.714 11.616 5.352 3.908 2.112-3.767-4.295-1.725v-.845l4.295-1.76-2.112-3.732-5.352 3.908v4.013Z"></path>
                                <path fill="#4876EF" d="m10.327 7.286.704-6.583-4.295.07.634 4.577-.74.422-3.66-2.816L.786 6.617l6.055 2.676 3.485-2.007Z"></path>
                                <path fill="#4876EE" d="M32.507 8.804v6.167h2.312v-7.86h-3.366v1.693h1.054ZM32.435 6.006c.212.22.535.33.968.33.434 0 .751-.11.953-.33.213-.23.318-.516.318-.86 0-.354-.105-.641-.318-.86-.202-.23-.52-.345-.953-.345-.433 0-.756.115-.968.344-.202.22-.303.507-.303.86 0 .345.101.632.303.861ZM24.46 14.799c.655.296 1.46.444 2.413.444.896 0 1.667-.139 2.312-.416.645-.277 1.141-.664 1.488-1.162.357-.506.535-1.094.535-1.764 0-.65-.169-1.2-.506-1.649-.328-.459-.785-.818-1.373-1.076-.587-.267-1.266-.435-2.037-.502l-.809-.071c-.481-.039-.828-.168-1.04-.388a1.08 1.08 0 0 1-.318-.774c0-.23.058-.44.173-.631.116-.201.29-.359.52-.474.241-.114.535-.172.882-.172.366 0 .67.067.91.201.053.029.104.059.15.09l.012.009.052.037c.146.111.263.243.35.395.125.21.188.444.188.703h2.311c0-.689-.159-1.286-.476-1.793-.318-.516-.776-.913-1.373-1.19-.588-.287-1.296-.43-2.124-.43-.79 0-1.474.133-2.052.4a3.131 3.131 0 0 0-1.358 1.12c-.318.487-.477 1.066-.477 1.735 0 .927.314 1.673.94 2.237.626.564 1.464.89 2.514.976l.794.071c.645.058 1.113.187 1.401.388a.899.899 0 0 1 .434.788 1.181 1.181 0 0 1-.231.717c-.154.201-.38.36-.68.474-.298.115-.669.172-1.112.172-.49 0-.89-.067-1.199-.2-.308-.144-.539-.33-.694-.56a1.375 1.375 0 0 1-.216-.746h-2.297c0 .679.168 1.281.505 1.807.337.517.834.928 1.489 1.234ZM39.977 15.07c-.8 0-1.445-.095-1.936-.286a2.03 2.03 0 0 1-1.084-.99c-.221-.469-.332-1.1-.332-1.893V8.789h-1.2V7.11h1.2V4.988h2.153V7.11h2.312V8.79h-2.312v3.198c0 .373.096.66.289.86.202.192.486.287.852.287h1.17v1.937h-1.112Z"></path>
                                <path fill="#4876EE" fill-rule="evenodd" d="M43.873 14.899c.52.23 1.117.344 1.791.344.665 0 1.252-.115 1.763-.344.51-.23.934-.55 1.271-.96.337-.412.564-.88.679-1.407h-2.124c-.096.24-.279.44-.549.603-.27.162-.616.244-1.04.244-.262 0-.497-.031-.704-.093a1.572 1.572 0 0 1-.423-.194 1.662 1.662 0 0 1-.636-.803 3.159 3.159 0 0 1-.163-.645h5.784v-.775a4.28 4.28 0 0 0-.463-1.98 3.686 3.686 0 0 0-1.343-1.477c-.578-.382-1.291-.574-2.139-.574-.645 0-1.223.115-1.733.345-.501.22-.92.52-1.257.903a4.178 4.178 0 0 0-.78 1.305c-.174.478-.26.98-.26 1.506v.287c0 .507.086 1.004.26 1.492.183.478.443.913.78 1.305.347.382.775.688 1.286.918Zm-.094-4.674.02-.09a2.507 2.507 0 0 1 .117-.356c.145-.354.356-.622.636-.804.104-.067.217-.123.339-.165.204-.071.433-.107.686-.107.395 0 .723.09.983.272.27.173.472.426.607.76a2.487 2.487 0 0 1 .16.603h-3.57c.006-.038.013-.076.022-.113Z" clip-rule="evenodd"></path>
                                <path fill="#4876EE" d="M50.476 14.97V7.112h1.835v1.98a4.54 4.54 0 0 1 .173-.603c.202-.536.506-.937.91-1.205.405-.277.9-.416 1.488-.416h.101c.598 0 1.094.139 1.489.416.404.268.707.67.91 1.205l.016.04.013.037.028-.077c.212-.536.52-.937.925-1.205.405-.277.901-.416 1.489-.416h.1c.598 0 1.098.139 1.503.416.414.268.727.67.94 1.205.211.535.317 1.205.317 2.008v4.475h-2.312v-4.604c0-.43-.115-.78-.346-1.047-.222-.268-.54-.402-.954-.402-.414 0-.742.139-.982.416-.241.268-.362.626-.362 1.076v4.56h-2.326v-4.603c0-.43-.115-.78-.346-1.047-.222-.268-.535-.402-.94-.402-.423 0-.756.139-.996.416-.241.268-.362.626-.362 1.076v4.56h-2.311Z"></path>
                                <path fill="#4876EE" fill-rule="evenodd" d="M68.888 13.456v1.515h1.834v-4.82c0-.726-.144-1.319-.433-1.778-.289-.468-.712-.817-1.271-1.047-.549-.23-1.228-.344-2.037-.344a27.76 27.76 0 0 0-.896.014c-.318.01-.626.024-.924.043l-.229.016a36.79 36.79 0 0 0-.552.042v1.936a81.998 81.998 0 0 1 1.733-.09 37.806 37.806 0 0 1 1.171-.025c.424 0 .732.1.925.301.193.201.289.502.289.904v.029h-1.43c-.704 0-1.325.09-1.864.272-.54.172-.959.445-1.257.818-.299.363-.448.832-.448 1.405 0 .526.12.98.361 1.363.24.373.573.66.997.86.433.201.934.302 1.502.302.55 0 1.012-.1 1.388-.302.385-.2.683-.487.895-.86a2.443 2.443 0 0 0 .228-.498l.018-.056Zm-.39-1.397v-.63h-1.445c-.405 0-.718.1-.939.3-.212.192-.318.455-.318.79 0 .157.026.3.08.429a.99.99 0 0 0 .238.345c.221.191.534.287.939.287a2.125 2.125 0 0 0 .394-.038c.106-.021.206-.052.3-.092.212-.095.385-.253.52-.473.135-.22.212-.526.23-.918Z" clip-rule="evenodd"></path>
                                <path fill="#4876EE" d="M72.106 14.97V7.11h1.835v2.595c.088-.74.31-1.338.665-1.791.481-.603 1.174-.904 2.08-.904h.303v1.98h-.578c-.635 0-1.127.172-1.473.516-.347.334-.52.822-.52 1.463v4.001h-2.312ZM79.92 11.298h.767l2.499 3.672h2.6l-3.169-4.51 2.606-3.35h-2.427l-2.875 3.737V4.5h-2.312v10.47h2.312v-3.672Z"></path>
                            </svg>
                        </div>
                        <div class="company-name">HR Management System</div>
                        <div class="company-subtitle">Human Resources Department</div>
                    </div>
                    
                    <!-- Title -->
                    <div class="title">
                        <h1>Employee Credentials</h1>
                        <p>Confidential Information</p>
                    </div>
                    
                    <!-- Employee Information Section -->
                    <div class="section">
                        <div class="info-row">
                            <div class="info-label">Employee ID:</div>
                            <div class="info-value">${user.employeeId || 'N/A'}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Full Name:</div>
                            <div class="info-value">${user.personalInfo?.fullName || user.username}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Department:</div>
                            <div class="info-value">${
                                user.department?.parentDepartment 
                                    ? user.department.parentDepartment.name 
                                    : (user.department?.name || 'Not assigned')
                            }</div>
                        </div>
                        ${user.department?.parentDepartment 
                            ? `<div class="info-row">
                                <div class="info-label">Sub-Department:</div>
                                <div class="info-value">${user.department.name}</div>
                            </div>`
                            : ''
                        }
                        <div class="info-row">
                            <div class="info-label">Position:</div>
                            <div class="info-value">${user.position?.title || 'Not assigned'}</div>
                        </div>
                    </div>
                    
                    <!-- Login Credentials Section -->
                    <div class="section">
                        <div class="section-title">Login Credentials</div>
                        <div class="credentials-box">
                            <div class="credential-item">
                                <div class="credential-label">Username:</div>
                                <div class="credential-value">${user.username}</div>
                            </div>
                            <div class="credential-item">
                                <div class="credential-label">Password:</div>
                                <div class="credential-value">${displayPassword}</div>
                                <div class="note">This is your temporary password. You will be required to change it upon first login.</div>
                            </div>
                            <div class="credential-item">
                                <div class="credential-label">Email Address:</div>
                                <div class="credential-value">${user.email}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Important Information Section -->
                    <div class="section">
                        <div class="section-title">Important Information</div>
                        <div class="info-box">
                            <ul>
                                <li>Keep your credentials confidential and do not share them with anyone.</li>
                                <li>Your account is set up with password never expires.</li>
                                <li>For security reasons, consider changing your password periodically.</li>
                                <li>If you suspect unauthorized access, contact IT support immediately.</li>
                                <li>For assistance, contact IT Help Desk: <strong>support@company.com</strong></li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Useful Links Section -->
                    <div class="section">
                        <div class="section-title">Useful Links</div>
                        <div class="links-section">
                            <div class="link-item">
                                <div class="link-label">Employee Portal:</div>
                                <div class="link-url">${window.location.origin}/app/dashboard</div>
                            </div>
                            <div class="link-item">
                                <div class="link-label">HR System:</div>
                                <div class="link-url">${window.location.origin}</div>
                            </div>
                            <div class="link-item">
                                <div class="link-label">Support Email:</div>
                                <div class="link-url">support@company.com</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="footer">
                        <p><strong>Generated on: ${new Date().toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</strong></p>
                        <p>This document is confidential and intended only for the named employee.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Write the HTML to the new window
        printWindow.document.write(credentialHTML);
        printWindow.document.close();

        // Wait for the content to load, then trigger print
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };

        return true;
    } catch (error) {

        return false;
    }
};

export default generateUserCredentialPDF;
