[repo_url]: https://github.com/saandre15/petz-mania-llc
[workflows_url]: [repo_url]/actions/workflows

<p align="center">
  <img src="https://petexec.s3.us-east-2.amazonaws.com/logos/973.gif">
</p>

<h1 style="text-align: center">Petz Mania LLC Website</h1>

![Development Build]([workflows]/build.yml/badge.svg?branch=development) 
![Development Test]([workflows]/test.yml/badge.svg?branch=development) | 

This is the open source version of the Petz Mania LLC website. The website will not work without the proper environment variables. Only authorized personels will have access to this information.

## Maintainers
- [Andre S.](https://github.com/saandre15) - Director of Software Engineering

## Global Dependencies
- NodeJS >= v14.16.0
- NPM >= 7.12.1
- PM2 >= 4.5.6

## Download
```bash
git clone https://github.com/saandre15/petz-mania-llc
cd petz-mania-llc
git checkout -b release-0.0.1
```

## Building
```bash
npm run build-{prod,dev}
```

## Test
```
npm run test
```

## Deploy
```bash
npm run start
```

## License
MIT @ 2021 Andre Sae.