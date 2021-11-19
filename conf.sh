#!/bin/bash -eu
# autoupdate repo to merge PRs
#
# Add pull refs to git branches you wish to pull
# fetch = +refs/pull/*/head:refs/remotes/origin/pr/*
# In producer export the values for BRANCH & GITOAUTH

list_issues()
{
python -c '
# replace this with one of your oauth keys from github (no permissions needed)
oauth = "'$3'"
import requests
issues = requests.get("https://api.github.com/search/issues", params={"q": "repo:'$1' type:pr state:open label:'$2'"}, headers={"Authorization": "token %s" % oauth, "Accept": "application/vnd.github.v3+json"})
issues.raise_for_status()
for issue in issues.json()["items"]:
    print(issue["number"])
' | sort -n
}

mark_deployed() {
  curl -d '{"labels": ["deployed_'$4'"]}' -X POST -H "Authorization: token $2" -H "Accept: application/vnd.github.v3+json"   https://api.github.com/repos/$1/issues/$3/labels
  if [ $4 == "staging" ]
  then
    curl -X POST -H "Authorization: $5" -H "Content-Type: application/json" --data-binary "{ \"value\": \"1ca56d76-4094-4d63-ad89-b6b8102a3df4\" }" https://api.clickup.com/api/v2/task/$6/field/c7dded3d-36af-4a7a-b9a6-a14496e88fc6/
    curl -X PUT -H "Authorization: $5" -H "Content-Type: application/json" --data-binary "{ \"status\": \"TESTING/QA\" }" https://api.clickup.com/api/v2/task/$6/
  elif [ $4 == "develop" ]
  then
    curl -X POST -H "Authorization: $5" -H "Content-Type: application/json" --data-binary "{ \"value\": \"d0dd0c44-c779-4e44-88d2-35dfa4d74075\" }" https://api.clickup.com/api/v2/task/$6/field/c7dded3d-36af-4a7a-b9a6-a14496e88fc6/
  fi
}

rm_deployed() {
  curl -X DELETE -H "Authorization: token $2" -H "Accept: application/vnd.github.v3+json"   https://api.github.com/repos/$1/issues/$3/labels/deployed_$4
  curl -X DELETE -H "Authorization: $5" -H "Content-Type: application/json" https://api.clickup.com/api/v2/task/$6/field/c7dded3d-36af-4a7a-b9a6-a14496e88fc6/
  curl -X PUT -H "Authorization: $5" -H "Content-Type: application/json" --data-binary "{ \"status\": \"DEV COMPLETE PR READY\" }" https://api.clickup.com/api/v2/task/$6/
}

mark_conflict() {
  curl -d '{"labels": ["conflict_'$4'"]}' -X POST -H "Authorization: token $2" -H "Accept: application/vnd.github.v3+json"   https://api.github.com/repos/$1/issues/$3/labels
}

rm_conflict() {
  curl -X DELETE -H "Authorization: token $2" -H "Accept: application/vnd.github.v3+json"   https://api.github.com/repos/$1/issues/$3/labels/conflict_$4
}

main_branch=origin/$BRANCH

extra_branches=(
    $(list_issues ForeverCompanies/producer $BRANCH $GITOAUTH | sed 's|^|origin/pr/|;')
)

expected_life=360

ulimit -c unlimited
