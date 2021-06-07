import * as navView from '../view/navView';

export default (e) => {
  // CLose the old UI
  navView.close();
  // Open New UI
  navView.open(e);
}