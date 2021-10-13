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
  curl -d '{"labels": ["deployed"]}' -X POST -H "Authorization: token $2" -H "Accept: application/vnd.github.v3+json"   https://api.github.com/repos/$1/issues/$3/labels
}

rm_deployed() {
  curl -X DELETE -H "Authorization: token $2" -H "Accept: application/vnd.github.v3+json"   https://api.github.com/repos/$1/issues/$3/labels/deployed
}

mark_conflict() {
  curl -d '{"labels": ["conflict"]}' -X POST -H "Authorization: token $2" -H "Accept: application/vnd.github.v3+json"   https://api.github.com/repos/$1/issues/$3/labels
}

rm_conflict() {
  curl -X DELETE -H "Authorization: token $2" -H "Accept: application/vnd.github.v3+json"   https://api.github.com/repos/$1/issues/$3/labels/conflict
}

main_branch=origin/$BRANCH

extra_branches=(
    $(list_issues ForeverCompanies/producer $BRANCH $GITOAUTH | sed 's|^|origin/pr/|;')
)

expected_life=360

ulimit -c unlimited
