# ODRL Agreement Instantiation

This library provides functionality to convert a set of ODRL Policies to an instanitated ODRL Agreement
based on a set of policies, an ODRL Request and the state of the world for the system.



## Installation

Clone repository and install dependencies
```
git clone https://github.com/Dexagod/ODRL-instantiation.git
cd ODRL-instantiation

cd conflict_resolution/
git clone https://github.com/joachimvh/policy-conflict-resolver.git
cd policy-conflict-resolver/
npm install
npm run build

cd ../../
npm install
```


## Run test 

```
ts-node src/index.ts
```


