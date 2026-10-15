---
'@stats-forge/github-stats-forge-core': minor
---

feat: say how a form asks for each param an endpoint reads

Each api handler now carries `PARAMS`, every param it reads with its `ParamKind` and, for a fixed set,
the accepted values. The catalog's options are checked against it, so a form cannot ask for a param
the way core does not read it.
