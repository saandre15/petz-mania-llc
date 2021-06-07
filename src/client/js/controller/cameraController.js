import cameraView from '../view/cameraView';

export const createUrl = (channel) => {
  const url = `wss://stream.petzmania.net:90${channel < 10 ? '0' : '' }${channel}`;
  return url;
}

export const changeStream = () => {
  cameraView.changeStream();
}