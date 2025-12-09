// Manual mock for react-router-dom
const mockNavigate = jest.fn();

module.exports = {
  useNavigate: () => mockNavigate,
  mockNavigate, // Export for test access
};
