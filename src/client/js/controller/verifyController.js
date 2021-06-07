import * as axios from 'axios';

export const googleRecaptcha = (token) => {
  const res = axios({
    method: 'post',
    url: 'https://www.google.com/recaptcha/api/siteverify',
    params: {
      secret: ''
    }
  })
}