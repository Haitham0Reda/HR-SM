/**
 * Email Generation Utility
 * 
 * Automatically generates unique email addresses for users based on their username
 * and company domain, with handling for duplicates.
 */

/**
 * Shorten email local part for better readability and brevity
 * @param {string} emailLocal - The local part of email (before @)
 * @returns {string} Shortened email local part
 */
const shortenEmailLocal = (emailLocal) => {
  if (!emailLocal) return '';
  
  // Split by dots to get name parts
  const parts = emailLocal.split('.');
  
  // If only one part, truncate to max 8 characters for shorter emails
  if (parts.length === 1) {
    return emailLocal.length <= 8 ? emailLocal : emailLocal.substring(0, 8);
  }
  
  // If two parts, create short combinations
  if (parts.length === 2) {
    const [first, last] = parts;
    
    // Strategy 1: first initial + last name (max 6 chars total)
    const firstInitialLast = `${first.charAt(0)}.${last}`;
    if (firstInitialLast.length <= 6) {
      return firstInitialLast;
    }
    
    // Strategy 2: first name + last initial (max 6 chars total)
    const firstLastInitial = `${first}.${last.charAt(0)}`;
    if (firstLastInitial.length <= 6) {
      return firstLastInitial;
    }
    
    // Strategy 3: first initial + last initial (always short)
    return `${first.charAt(0)}.${last.charAt(0)}`;
  }
  
  // If three parts, use special rule: full first name + 3 chars from middle + 2 chars from last
  if (parts.length === 3) {
    const [first, middle, last] = parts;
    const middlePart = middle.substring(0, 3);
    const lastPart = last.substring(0, 2);
    return `${first}.${middlePart}.${lastPart}`;
  }
  
  // If more than three parts, use first + 3 chars from second-to-last + 2 chars from last
  if (parts.length > 3) {
    const first = parts[0];
    const secondToLast = parts[parts.length - 2];
    const last = parts[parts.length - 1];
    const middlePart = secondToLast.substring(0, 3);
    const lastPart = last.substring(0, 2);
    return `${first}.${middlePart}.${lastPart}`;
  }
  
  return emailLocal.substring(0, 6);
};
/**
 * Sanitize name for email generation with aggressive shortening
 * @param {string} name - Raw name
 * @returns {string} Sanitized name suitable for email
 */
const sanitizeName = (name) => {
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-\s]/g, '') // Remove invalid characters but keep spaces
    .replace(/\s+/g, '.') // Replace spaces with dots
    .replace(/^[._-]+|[._-]+$/g, '') // Remove leading/trailing dots, underscores, hyphens
    .substring(0, 64); // Limit length (email local part max is 64 chars)
  
  // Apply aggressive shortening logic for all names
  return shortenEmailLocal(sanitized);
};

/**
 * Generate email from user's name
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {string} domain - Company email domain
 * @returns {string} Base email address
 */
const generateEmailFromName = (firstName, lastName, domain) => {
  if (!firstName || !lastName || !domain) {
    throw new Error('First name, last name, and domain are required for email generation');
  }
  
  const fullName = `${firstName} ${lastName}`;
  const sanitizedName = sanitizeName(fullName);
  return `${sanitizedName}@${domain}`;
};

/**
 * Sanitize username for email generation with aggressive shortening (fallback method)
 * @param {string} username - Raw username
 * @returns {string} Sanitized username suitable for email
 */
const sanitizeUsername = (username) => {
  const sanitized = username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._\-\s]/g, '') // Keep spaces temporarily for processing
    .replace(/\s+/g, '.') // Replace spaces with dots
    .replace(/^[._-]+|[._-]+$/g, '') // Remove leading/trailing dots, underscores, hyphens
    .substring(0, 64); // Limit length (email local part max is 64 chars)
  
  // Apply aggressive shortening logic for all usernames
  return shortenEmailLocal(sanitized);
};

/**
 * Generate base email from username and domain (fallback method)
 * @param {string} username - User's username
 * @param {string} domain - Company email domain
 * @returns {string} Base email address
 */
const generateBaseEmail = (username, domain) => {
  const sanitizedUsername = sanitizeUsername(username);
  return `${sanitizedUsername}@${domain}`;
};

/**
 * Check if email exists in the database
 * @param {Object} UserModel - Mongoose User model
 * @param {string} email - Email to check
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} True if email exists
 */
const emailExists = async (UserModel, email, tenantId) => {
  const existingUser = await UserModel.findOne({ 
    email: email.toLowerCase(), 
    tenantId 
  });
  return !!existingUser;
};

/**
 * Generate unique email address for a user
 * @param {Object} UserModel - Mongoose User model
 * @param {Object} userData - User data containing username, firstName, lastName, and optionally personalInfo
 * @param {string} domain - Company email domain
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<string>} Unique email address
 */
export const generateUniqueEmail = async (UserModel, userData, domain, tenantId) => {
  if (!domain || !tenantId) {
    throw new Error('Domain and tenantId are required for email generation');
  }

  let baseEmail;
  
  // Try username first (primary method)
  if (userData.username) {
    baseEmail = generateBaseEmail(userData.username, domain);
  }
  // Fallback to name if username is not available
  else if (userData.firstName && userData.lastName) {
    baseEmail = generateEmailFromName(userData.firstName, userData.lastName, domain);
  } 
  // Fallback to nested personalInfo structure
  else if (userData.personalInfo?.firstName && userData.personalInfo?.lastName) {
    baseEmail = generateEmailFromName(userData.personalInfo.firstName, userData.personalInfo.lastName, domain);
  }
  else {
    throw new Error('Either username or firstName+lastName is required for email generation');
  }
  
  // Check if base email is available
  if (!(await emailExists(UserModel, baseEmail, tenantId))) {
    return baseEmail;
  }

  // If base email exists, try variations with numbers
  const emailParts = baseEmail.split('@');
  const localPart = emailParts[0];
  const domainPart = emailParts[1];
  
  let counter = 1;
  let uniqueEmail;

  do {
    uniqueEmail = `${localPart}${counter}@${domainPart}`;
    counter++;
    
    // Prevent infinite loop - max 999 attempts
    if (counter > 999) {
      throw new Error('Unable to generate unique email after 999 attempts');
    }
  } while (await emailExists(UserModel, uniqueEmail, tenantId));

  return uniqueEmail;
};

/**
 * Generate multiple unique emails for bulk operations
 * @param {Object} UserModel - Mongoose User model
 * @param {Array} users - Array of user objects with firstName, lastName, or username
 * @param {string} domain - Company email domain
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Array of user objects with generated email property
 */
export const generateBulkUniqueEmails = async (UserModel, users, domain, tenantId) => {
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('Users array is required and cannot be empty');
  }

  if (!domain || !tenantId) {
    throw new Error('Domain and tenantId are required for bulk email generation');
  }

  const usersWithEmails = [];
  const usedEmails = new Set();

  // Get all existing emails in the tenant to avoid conflicts
  const existingUsers = await UserModel.find({ tenantId }, { email: 1 });
  existingUsers.forEach(user => usedEmails.add(user.email.toLowerCase()));

  for (const user of users) {
    let baseEmail;
    
    // Try username first (primary method)
    if (user.username) {
      baseEmail = generateBaseEmail(user.username, domain);
    }
    // Fallback to name if username is not available
    else if (user.firstName && user.lastName) {
      baseEmail = generateEmailFromName(user.firstName, user.lastName, domain);
    }
    // Check nested personalInfo structure
    else if (user.personalInfo?.firstName && user.personalInfo?.lastName) {
      baseEmail = generateEmailFromName(user.personalInfo.firstName, user.personalInfo.lastName, domain);
    }
    else {
      throw new Error(`User must have username or firstName+lastName for email generation. User data: ${JSON.stringify(user)}`);
    }

    let uniqueEmail = baseEmail;

    if (usedEmails.has(baseEmail.toLowerCase())) {
      // Generate numbered variation
      const emailParts = baseEmail.split('@');
      const localPart = emailParts[0];
      const domainPart = emailParts[1];
      
      let counter = 1;
      do {
        uniqueEmail = `${localPart}${counter}@${domainPart}`;
        counter++;
        
        if (counter > 999) {
          throw new Error(`Unable to generate unique email for user after 999 attempts. User data: ${JSON.stringify(user)}`);
        }
      } while (usedEmails.has(uniqueEmail.toLowerCase()));
    }

    usedEmails.add(uniqueEmail.toLowerCase());
    usersWithEmails.push({
      ...user,
      email: uniqueEmail
    });
  }

  return usersWithEmails;
};

/**
 * Validate email domain format
 * @param {string} domain - Domain to validate
 * @returns {boolean} True if domain is valid
 */
export const validateEmailDomain = (domain) => {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  return domainRegex.test(domain);
};

/**
 * Extract domain from email address
 * @param {string} email - Email address
 * @returns {string|null} Domain part or null if invalid
 */
export const extractDomainFromEmail = (email) => {
  const emailRegex = /^[^\s@]+@([^\s@]+)$/;
  const match = email.match(emailRegex);
  return match ? match[1] : null;
};

/**
 * Generate email preview from user data (for frontend preview)
 * @param {Object} userData - User data containing username, firstName, lastName, or personalInfo
 * @param {string} domain - Company email domain
 * @returns {string} Preview email address
 */
export const generateEmailPreview = (userData, domain) => {
  if (!domain) return '';
  
  try {
    // Try username first (primary method)
    if (userData.username) {
      return generateBaseEmail(userData.username, domain);
    }
    // Fallback to name if username is not available
    else if (userData.firstName && userData.lastName) {
      return generateEmailFromName(userData.firstName, userData.lastName, domain);
    }
    // Check nested personalInfo structure
    else if (userData.personalInfo?.firstName && userData.personalInfo?.lastName) {
      return generateEmailFromName(userData.personalInfo.firstName, userData.personalInfo.lastName, domain);
    }
    
    return '';
  } catch (error) {
    return '';
  }
};

export default {
  generateUniqueEmail,
  generateBulkUniqueEmails,
  generateEmailPreview,
  validateEmailDomain,
  extractDomainFromEmail
};