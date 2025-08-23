// CSS styles (to be imported)
export const errorBoundaryStyles = `
.error-boundary-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
}

.error-boundary-content {
  max-width: 500px;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-boundary-content h2 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.error-boundary-content p {
  color: #6c757d;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.error-details {
  margin: 1.5rem 0;
  text-align: left;
}

.error-details details {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 1rem;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #495057;
}

.error-info {
  margin-top: 1rem;
  font-family: monospace;
  font-size: 0.875rem;
  color: #6c757d;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.retry-button,
.reload-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button {
  background: #007bff;
  color: white;
}

.retry-button:hover {
  background: #0056b3;
}

.reload-button {
  background: #6c757d;
  color: white;
}

.reload-button:hover {
  background: #545b62;
}

.component-error-fallback {
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  margin: 0.5rem 0;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #856404;
}

.retry-button-small {
  padding: 0.25rem 0.5rem;
  background: #ffc107;
  border: none;
  border-radius: 3px;
  font-size: 0.75rem;
  cursor: pointer;
  color: #212529;
}

.retry-button-small:hover {
  background: #e0a800;
}

.section-error-fallback {
  padding: 2rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  margin: 1rem 0;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.error-header h3 {
  margin: 0;
  color: #721c24;
}

.section-error-fallback p {
  color: #721c24;
  margin-bottom: 1.5rem;
}
`;