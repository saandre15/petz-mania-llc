export const copyInputBox = (e) => {
  const inputGroup = e.target.closest('.input-group');
  const inputBox = inputGroup.querySelector('input[type="text"]');
  inputBox.select();
  document.execCommand('copy');
  return inputBox.value;
}