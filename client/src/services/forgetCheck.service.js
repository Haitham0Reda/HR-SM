import api from './api';

const FORGET_CHECK_API_URL = '/forget-checks';

class ForgetCheckService {
  // Get all forget check records
  async getAllForgetChecks() {
    try {
      console.log('Calling API to get all forget checks');
      const response = await api.get(FORGET_CHECK_API_URL);
      console.log('API response received:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error in getAllForgetChecks:', error);
      console.error('Error response:', error.response);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      }
      throw new Error(error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch forget check records');
    }
  }

  // Get forget check by ID
  async getForgetCheckById(id) {
    try {
      const response = await api.get(`${FORGET_CHECK_API_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch forget check record');
    }
  }

  // Create new forget check record
  async createForgetCheck(forgetCheckData) {
    try {
      console.log('Creating forget check with data:', forgetCheckData);
      
      // Format the data properly for the API
      const formattedData = {
        ...forgetCheckData,
        date: forgetCheckData.date instanceof Date ? forgetCheckData.date.toISOString() : forgetCheckData.date,
        requestedTime: forgetCheckData.requestedTime instanceof Date ? forgetCheckData.requestedTime.toISOString() : forgetCheckData.requestedTime
      };
      
      console.log('Sending formatted data:', formattedData);
      const response = await api.post(FORGET_CHECK_API_URL, formattedData);
      console.log('Forget check created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating forget check:', error);
      console.error('Error response:', error.response);
      console.error('Error request:', error.request);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to create forget check record';
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.error || error.response.data?.message || 
                      `Server error: ${error.response.status}`;
        console.log('Server error details:', error.response.data);
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error: No response from server';
      } else {
        // Something else happened
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      throw new Error(errorMessage);
    }
  }

  // Update forget check record
  async updateForgetCheck(id, forgetCheckData) {
    try {
      const response = await api.put(`${FORGET_CHECK_API_URL}/${id}`, forgetCheckData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update forget check record');
    }
  }

  // Delete forget check record
  async deleteForgetCheck(id) {
    try {
      const response = await api.delete(`${FORGET_CHECK_API_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete forget check record');
    }
  }
}

const forgetCheckService = new ForgetCheckService();

export default forgetCheckService;