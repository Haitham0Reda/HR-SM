// Generate Employee ID Card (Front and Back)
export const generateUserIDCard = (user) => {
    try {
        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        
        if (!printWindow) {
            throw new Error('Popup blocked. Please allow popups for this site.');
        }

        const idCardHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>ID Card - ${user.personalInfo?.fullName || user.username}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    body { 
                        font-family: 'Inter', 'Segoe UI', sans-serif;
                        background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
                        padding: 40px 20px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    
                    .container {
                        display: flex;
                        gap: 50px;
                        flex-wrap: wrap;
                        justify-content: center;
                    }
                    
                    .card {
                        width: 290px;
                        height: 460px;
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        overflow: visible;
                        position: relative;
                        transition: transform 0.3s ease;
                    }
                    
                    .card:hover {
                        transform: translateY(-5px);
                    }
                    
                    /* Front Card */
                    .card-front {
                        background: white;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .card-front::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 200px;
                        background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
                        border-radius: 20px 20px 0 0;
                    }
                    
                    .card-front::after {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 200px;
                        background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
                        opacity: 0.3;
                        border-radius: 20px 20px 0 0;
                    }
                    
                    .card-front .header {
                        padding: 25px 25px 100px;
                        text-align: center;
                        position: relative;
                        z-index: 1;
                    }
                    
                    .logo {
                        height: 18px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 15px;
                    }
                    
                    .logo svg {
                        height: 100%;
                        width: auto;
                        filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
                    }
                    
                    .company-info {
                        color: white;
                    }
                    
                    .company-name {
                        font-size: 15px;
                        font-weight: 700;
                        margin-bottom: 5px;
                        letter-spacing: 0.5px;
                        text-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        text-transform: uppercase;
                    }
                    
                    .company-subtitle {
                        font-size: 11px;
                        opacity: 0.9;
                        font-weight: 500;
                        letter-spacing: 0.8px;
                        text-transform: uppercase;
                    }
                    
                    .card-body {
                        padding: 0 25px 30px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        margin-top: -80px;
                        position: relative;
                        z-index: 2;
                    }
                    
                    .photo {
                        width: 140px;
                        height: 140px;
                        border-radius: 20px;
                        background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
                        border: 5px solid white;
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 56px;
                        font-weight: 700;
                        color: white;
                        margin-bottom: 22px;
                        box-shadow: 0 12px 35px rgba(13, 71, 161, 0.35);
                        position: relative;
                    }
                    
                    .photo::after {
                        content: '';
                        position: absolute;
                        inset: 0;
                        border-radius: 15px;
                        box-shadow: inset 0 2px 10px rgba(0,0,0,0.15);
                        pointer-events: none;
                    }
                    
                    .photo img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    
                    .info {
                        width: 100%;
                    }
                    
                    .name {
                        font-size: 18px;
                        font-weight: 600;
                        color: #0d47a1;
                        margin-bottom: 5px;
                        line-height: 1.2;
                        letter-spacing: -0.3px;
                        text-transform: uppercase;
                    }
                    
                    .position {
                        font-size: 13px;
                        color: #1976d2;
                        margin-bottom: 4px;
                        font-weight: 700;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                    }
                    
                    .department {
                        font-size: 11px;
                        color: #757575;
                        margin-bottom: 18px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .divider {
                        width: 60px;
                        height: 4px;
                        background: linear-gradient(90deg, #1565c0, #1976d2, #42a5f5);
                        border-radius: 2px;
                        margin: 12px auto 18px;
                        box-shadow: 0 2px 10px rgba(25, 118, 210, 0.4);
                    }
                    
                    .id-section {
                        background: linear-gradient(135deg, #0d47a1 0%, #1565c0 100%);
                        padding: 15px 19px;
                        border-radius: 15px;
                        margin-top: 3px;
                        border: none;
                        box-shadow: 0 8px 20px rgba(13, 71, 161, 0.3);
                        width: 100%;
                        min-height: 70px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .id-section::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        right: -50%;
                        width: 100%;
                        height: 100%;
                        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                        pointer-events: none;
                    }
                    
                    .id-number {
                        font-size: 9px;
                        color: rgba(255,255,255,0.7);
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        font-weight: 700;
                        position: relative;
                        z-index: 1;
                    }
                    
                    .id-value {
                        font-size: 15px;
                        font-weight: 900;
                        color: white;
                        letter-spacing: 1.5px;
                        word-break: break-word;
                        text-align: center;
                        line-height: 1.3;
                        text-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        position: relative;
                        z-index: 1;
                    }
                    
                    /* Back Card */
                    .card-back {
                        background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 40px 30px;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .card-back::before {
                        content: '';
                        position: absolute;
                        width: 200px;
                        height: 200px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 50%;
                        top: -100px;
                        right: -100px;
                    }
                    
                    .card-back::after {
                        content: '';
                        position: absolute;
                        width: 150px;
                        height: 150px;
                        background: rgba(255,255,255,0.05);
                        border-radius: 50%;
                        bottom: -75px;
                        left: -75px;
                    }
                    
                    .back-logo {
                        width: 180px;
                        height: auto;
                        margin-bottom: 40px;
                        position: relative;
                        z-index: 1;
                        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2));
                    }
                    
                    .back-logo svg {
                        width: 100%;
                        height: auto;
                    }
                    
                    .back-text {
                        text-align: center;
                        color: white;
                        position: relative;
                        z-index: 1;
                    }
                    
                    .back-company {
                        font-size: 20px;
                        font-weight: 700;
                        margin-bottom: 8px;
                        letter-spacing: 0.5px;
                    }
                    
                    .back-tagline {
                        font-size: 13px;
                        opacity: 0.9;
                        margin-bottom: 30px;
                        font-weight: 500;
                    }
                    
                    .back-divider {
                        width: 80px;
                        height: 2px;
                        background: rgba(255,255,255,0.3);
                        margin: 20px auto;
                    }
                    
                    .back-contact {
                        font-size: 11px;
                        opacity: 0.85;
                        line-height: 1.8;
                        font-weight: 500;
                    }
                    
                    .back-contact div {
                        margin-bottom: 4px;
                    }
                    
                    @media print {
                        body { 
                            background: white; 
                            padding: 0;
                        }
                        .container {
                            gap: 20px;
                        }
                        .card { 
                            box-shadow: none;
                            border: 1px solid #ddd;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <!-- Front Card -->
                    <div class="card card-front">
                        <div class="header">
                            <div class="logo">
                                    <svg viewBox="0 0 86 19" width="86" height="19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fill="#ffffff" d="m.787 12.567 6.055-2.675 3.485 2.006.704 6.583-4.295-.035.634-4.577-.74-.422-3.625 2.817-2.218-3.697Z"></path>
                                        <path fill="#ffffff" d="m10.714 11.616 5.352 3.908 2.112-3.767-4.295-1.725v-.845l4.295-1.76-2.112-3.732-5.352 3.908v4.013Z"></path>
                                        <path fill="#ffffff" d="m10.327 7.286.704-6.583-4.295.07.634 4.577-.74.422-3.66-2.816L.786 6.617l6.055 2.676 3.485-2.007Z"></path>
                                        <path fill="#ffffff" d="M32.507 8.804v6.167h2.312v-7.86h-3.366v1.693h1.054ZM32.435 6.006c.212.22.535.33.968.33.434 0 .751-.11.953-.33.213-.23.318-.516.318-.86 0-.354-.105-.641-.318-.86-.202-.23-.52-.345-.953-.345-.433 0-.756.115-.968.344-.202.22-.303.507-.303.86 0 .345.101.632.303.861ZM24.46 14.799c.655.296 1.46.444 2.413.444.896 0 1.667-.139 2.312-.416.645-.277 1.141-.664 1.488-1.162.357-.506.535-1.094.535-1.764 0-.65-.169-1.2-.506-1.649-.328-.459-.785-.818-1.373-1.076-.587-.267-1.266-.435-2.037-.502l-.809-.071c-.481-.039-.828-.168-1.04-.388a1.08 1.08 0 0 1-.318-.774c0-.23.058-.44.173-.631.116-.201.29-.359.52-.474.241-.114.535-.172.882-.172.366 0 .67.067.91.201.053.029.104.059.15.09l.012.009.052.037c.146.111.263.243.35.395.125.21.188.444.188.703h2.311c0-.689-.159-1.286-.476-1.793-.318-.516-.776-.913-1.373-1.19-.588-.287-1.296-.43-2.124-.43-.79 0-1.474.133-2.052.4a3.131 3.131 0 0 0-1.358 1.12c-.318.487-.477 1.066-.477 1.735 0 .927.314 1.673.94 2.237.626.564 1.464.89 2.514.976l.794.071c.645.058 1.113.187 1.401.388a.899.899 0 0 1 .434.788 1.181 1.181 0 0 1-.231.717c-.154.201-.38.36-.68.474-.298.115-.669.172-1.112.172-.49 0-.89-.067-1.199-.2-.308-.144-.539-.33-.694-.56a1.375 1.375 0 0 1-.216-.746h-2.297c0 .679.168 1.281.505 1.807.337.517.834.928 1.489 1.234ZM39.977 15.07c-.8 0-1.445-.095-1.936-.286a2.03 2.03 0 0 1-1.084-.99c-.221-.469-.332-1.1-.332-1.893V8.789h-1.2V7.11h1.2V4.988h2.153V7.11h2.312V8.79h-2.312v3.198c0 .373.096.66.289.86.202.192.486.287.852.287h1.17v1.937h-1.112Z"></path>
                                        <path fill="#ffffff" fill-rule="evenodd" d="M43.873 14.899c.52.23 1.117.344 1.791.344.665 0 1.252-.115 1.763-.344.51-.23.934-.55 1.271-.96.337-.412.564-.88.679-1.407h-2.124c-.096.24-.279.44-.549.603-.27.162-.616.244-1.04.244-.262 0-.497-.031-.704-.093a1.572 1.572 0 0 1-.423-.194 1.662 1.662 0 0 1-.636-.803 3.159 3.159 0 0 1-.163-.645h5.784v-.775a4.28 4.28 0 0 0-.463-1.98 3.686 3.686 0 0 0-1.343-1.477c-.578-.382-1.291-.574-2.139-.574-.645 0-1.223.115-1.733.345-.501.22-.92.52-1.257.903a4.178 4.178 0 0 0-.78 1.305c-.174.478-.26.98-.26 1.506v.287c0 .507.086 1.004.26 1.492.183.478.443.913.78 1.305.347.382.775.688 1.286.918Zm-.094-4.674.02-.09a2.507 2.507 0 0 1 .117-.356c.145-.354.356-.622.636-.804.104-.067.217-.123.339-.165.204-.071.433-.107.686-.107.395 0 .723.09.983.272.27.173.472.426.607.76a2.487 2.487 0 0 1 .16.603h-3.57c.006-.038.013-.076.022-.113Z" clip-rule="evenodd"></path>
                                        <path fill="#ffffff" d="M50.476 14.97V7.112h1.835v1.98a4.54 4.54 0 0 1 .173-.603c.202-.536.506-.937.91-1.205.405-.277.9-.416 1.488-.416h.101c.598 0 1.094.139 1.489.416.404.268.707.67.91 1.205l.016.04.013.037.028-.077c.212-.536.52-.937.925-1.205.405-.277.901-.416 1.489-.416h.1c.598 0 1.098.139 1.503.416.414.268.727.67.94 1.205.211.535.317 1.205.317 2.008v4.475h-2.312v-4.604c0-.43-.115-.78-.346-1.047-.222-.268-.54-.402-.954-.402-.414 0-.742.139-.982.416-.241.268-.362.626-.362 1.076v4.56h-2.326v-4.603c0-.43-.115-.78-.346-1.047-.222-.268-.535-.402-.94-.402-.423 0-.756.139-.996.416-.241.268-.362.626-.362 1.076v4.56h-2.311Z"></path>
                                        <path fill="#ffffff" fill-rule="evenodd" d="M68.888 13.456v1.515h1.834v-4.82c0-.726-.144-1.319-.433-1.778-.289-.468-.712-.817-1.271-1.047-.549-.23-1.228-.344-2.037-.344a27.76 27.76 0 0 0-.896.014c-.318.01-.626.024-.924.043l-.229.016a36.79 36.79 0 0 0-.552.042v1.936a81.998 81.998 0 0 1 1.733-.09 37.806 37.806 0 0 1 1.171-.025c.424 0 .732.1.925.301.193.201.289.502.289.904v.029h-1.43c-.704 0-1.325.09-1.864.272-.54.172-.959.445-1.257.818-.299.363-.448.832-.448 1.405 0 .526.12.98.361 1.363.24.373.573.66.997.86.433.201.934.302 1.502.302.55 0 1.012-.1 1.388-.302.385-.2.683-.487.895-.86a2.443 2.443 0 0 0 .228-.498l.018-.056Zm-.39-1.397v-.63h-1.445c-.405 0-.718.1-.939.3-.212.192-.318.455-.318.79 0 .157.026.3.08.429a.99.99 0 0 0 .238.345c.221.191.534.287.939.287a2.125 2.125 0 0 0 .394-.038c.106-.021.206-.052.3-.092.212-.095.385-.253.52-.473.135-.22.212-.526.23-.918Z" clip-rule="evenodd"></path>
                                        <path fill="#ffffff" d="M72.106 14.97V7.11h1.835v2.595c.088-.74.31-1.338.665-1.791.481-.603 1.174-.904 2.08-.904h.303v1.98h-.578c-.635 0-1.127.172-1.473.516-.347.334-.52.822-.52 1.463v4.001h-2.312ZM79.92 11.298h.767l2.499 3.672h2.6l-3.169-4.51 2.606-3.35h-2.427l-2.875 3.737V4.5h-2.312v10.47h2.312v-3.672Z"></path>
                                    </svg>
                            </div>
                            <div class="company-info">
                                <div class="company-name">HR Management System</div>
                                <div class="company-subtitle">Employee Identification Card</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="photo">
                                ${user.personalInfo?.profilePicture ? 
                                    `<img src="${user.personalInfo.profilePicture}" alt="Photo" />` : 
                                    (user.personalInfo?.fullName || user.username)?.charAt(0).toUpperCase()
                                }
                            </div>
                            <div class="info">
                                <div class="name">${user.personalInfo?.fullName || user.username}</div>
                                <div class="position">${user.position?.title || 'Employee'}</div>
                                <div class="department">${
                                    user.department?.parentDepartment 
                                        ? user.department.parentDepartment.name
                                        : (user.department?.name || 'General Department')
                                }</div>
                                ${user.department?.parentDepartment 
                                    ? `<div class="department" style="font-size: 11px; margin-top: -5px;">└─ ${user.department.name}</div>`
                                    : ''
                                }
                                <div class="divider"></div>
                                <div class="id-section">
                                    <div class="id-number">Employee ID</div>
                                    <div class="id-value">${user.employeeId || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Back Card -->
                    <div class="card card-back">
                        <div class="back-logo">
                            <svg viewBox="0 0 86 19" width="86" height="19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#B4C0D3" d="m.787 12.567 6.055-2.675 3.485 2.006.704 6.583-4.295-.035.634-4.577-.74-.422-3.625 2.817-2.218-3.697 Z"></path>
                                <path fill="#00D3AB" d="m10.714 11.616 5.352 3.908 2.112-3.767-4.295-1.725v-.845l4.295-1.76-2.112-3.732-5.352 3.908v4.013Z"></path>
                                <path fill="#4876EF" d="m10.327 7.286.704-6.583-4.295.07.634 4.577-.74.422-3.66-2.816L.786 6.617l6.055 2.676 3.485-2.007Z"></path>
                                <path fill="#ffffff" d="M32.507 8.804v6.167h2.312v-7.86h-3.366v1.693h1.054ZM32.435 6.006c.212.22.535.33.968.33.434 0 .751-.11.953-.33.213-.23.318-.516.318-.86 0-.354-.105-.641-.318-.86-.202-.23-.52-.345-.953-.345-.433 0-.756.115-.968.344-.202.22-.303.507-.303.86 0 .345.101.632.303.861ZM24.46 14.799c.655.296 1.46.444 2.413.444.896 0 1.667-.139 2.312-.416.645-.277 1.141-.664 1.488-1.162.357-.506.535-1.094.535-1.764 0-.65-.169-1.2-.506-1.649-.328-.459-.785-.818-1.373-1.076-.587-.267-1.266-.435-2.037-.502l-.809-.071c-.481-.039-.828-.168-1.04-.388a1.08 1.08 0 0 1-.318-.774c0-.23.058-.44.173-.631.116-.201.29-.359.52-.474.241-.114.535-.172.882-.172.366 0 .67.067.91.201.053.029.104.059.15.09l.012.009.052.037c.146.111.263.243.35.395.125.21.188.444.188.703h2.311c0-.689-.159-1.286-.476-1.793-.318-.516-.776-.913-1.373-1.19-.588-.287-1.296-.43-2.124-.43-.79 0-1.474.133-2.052.4a3.131 3.131 0 0 0-1.358 1.12c-.318.487-.477 1.066-.477 1.735 0 .927.314 1.673.94 2.237.626.564 1.464.89 2.514.976l.794.071c.645.058 1.113.187 1.401.388a.899.899 0 0 1 .434.788 1.181 1.181 0 0 1-.231.717c-.154.201-.38.36-.68.474-.298.115-.669.172-1.112.172-.49 0-.89-.067-1.199-.2-.308-.144-.539-.33-.694-.56a1.375 1.375 0 0 1-.216-.746h-2.297c0 .679.168 1.281.505 1.807.337.517.834.928 1.489 1.234ZM39.977 15.07c-.8 0-1.445-.095-1.936-.286a2.03 2.03 0 0 1-1.084-.99c-.221-.469-.332-1.1-.332-1.893V8.789h-1.2V7.11h1.2V4.988h2.153V7.11h2.312V8.79h-2.312v3.198c0 .373.096.66.289.86.202.192.486.287.852.287h1.17v1.937h-1.112Z"></path>
                                <path fill="#ffffff" fill-rule="evenodd" d="M43.873 14.899c.52.23 1.117.344 1.791.344.665 0 1.252-.115 1.763-.344.51-.23.934-.55 1.271-.96.337-.412.564-.88.679-1.407h-2.124c-.096.24-.279.44-.549.603-.27.162-.616.244-1.04.244-.262 0-.497-.031-.704-.093a1.572 1.572 0 0 1-.423-.194 1.662 1.662 0 0 1-.636-.803 3.159 3.159 0 0 1-.163-.645h5.784v-.775a4.28 4.28 0 0 0-.463-1.98 3.686 3.686 0 0 0-1.343-1.477c-.578-.382-1.291-.574-2.139-.574-.645 0-1.223.115-1.733.345-.501.22-.92.52-1.257.903a4.178 4.178 0 0 0-.78 1.305c-.174.478-.26.98-.26 1.506v.287c0 .507.086 1.004.26 1.492.183.478.443.913.78 1.305.347.382.775.688 1.286.918Zm-.094-4.674.02-.09a2.507 2.507 0 0 1 .117-.356c.145-.354.356-.622.636-.804.104-.067.217-.123.339-.165.204-.071.433-.107.686-.107.395 0 .723.09.983.272.27.173.472.426.607.76a2.487 2.487 0 0 1 .16.603h-3.57c.006-.038.013-.076.022-.113Z" clip-rule="evenodd"></path>
                                <path fill="#ffffff" d="M50.476 14.97V7.112h1.835v1.98a4.54 4.54 0 0 1 .173-.603c.202-.536.506-.937.91-1.205.405-.277.9-.416 1.488-.416h.101c.598 0 1.094.139 1.489.416.404.268.707.67.91 1.205l.016.04.013.037.028-.077c.212-.536.52-.937.925-1.205.405-.277.901-.416 1.489-.416h.1c.598 0 1.098.139 1.503.416.414.268.727.67.94 1.205.211.535.317 1.205.317 2.008v4.475h-2.312v-4.604c0-.43-.115-.78-.346-1.047-.222-.268-.54-.402-.954-.402-.414 0-.742.139-.982.416-.241.268-.362.626-.362 1.076v4.56h-2.326v-4.603c0-.43-.115-.78-.346-1.047-.222-.268-.535-.402-.94-.402-.423 0-.756.139-.996.416-.241.268-.362.626-.362 1.076v4.56h-2.311Z"></path>
                                <path fill="#ffffff" fill-rule="evenodd" d="M68.888 13.456v1.515h1.834v-4.82c0-.726-.144-1.319-.433-1.778-.289-.468-.712-.817-1.271-1.047-.549-.23-1.228-.344-2.037-.344a27.76 27.76 0 0 0-.896.014c-.318.01-.626.024-.924.043l-.229.016a36.79 36.79 0 0 0-.552.042v1.936a81.998 81.998 0 0 1 1.733-.09 37.806 37.806 0 0 1 1.171-.025c.424 0 .732.1.925.301.193.201.289.502.289.904v.029h-1.43c-.704 0-1.325.09-1.864.272-.54.172-.959.445-1.257.818-.299.363-.448.832-.448 1.405 0 .526.12.98.361 1.363.24.373.573.66.997.86.433.201.934.302 1.502.302.55 0 1.012-.1 1.388-.302.385-.2.683-.487.895-.86a2.443 2.443 0 0 0 .228-.498l.018-.056Zm-.39-1.397v-.63h-1.445c-.405 0-.718.1-.939.3-.212.192-.318.455-.318.79 0 .157.026.3.08.429a.99.99 0 0 0 .238.345c.221.191.534.287.939.287a2.125 2.125 0 0 0 .394-.038c.106-.021.206-.052.3-.092.212-.095.385-.253.52-.473.135-.22.212-.526.23-.918Z" clip-rule="evenodd"></path>
                                <path fill="#ffffff" d="M72.106 14.97V7.11h1.835v2.595c.088-.74.31-1.338.665-1.791.481-.603 1.174-.904 2.08-.904h.303v1.98h-.578c-.635 0-1.127.172-1.473.516-.347.334-.52.822-.52 1.463v4.001h-2.312ZM79.92 11.298h.767l2.499 3.672h2.6l-3.169-4.51 2.606-3.35h-2.427l-2.875 3.737V4.5h-2.312v10.47h2.312v-3.672Z"></path>
                            </svg>
                        </div>
                        <div class="back-text">
                            <div class="back-company">HR Management System</div>
                            <div class="back-tagline">Employee Identification</div>
                            <div class="back-divider"></div>
                            <div class="back-contact">
                                <div>www.hrmanagement.com</div>
                                <div>support@hrmanagement.com</div>
                                <div>+1 (555) 123-4567</div>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(idCardHTML);
        printWindow.document.close();

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

export default generateUserIDCard;
