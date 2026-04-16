CSV Files can be imported with the following columns:

| Column             | Format                                          |
| ------------------ | ----------------------------------------------- |
| `FIRST`            | String (Semirequired)                           |
| `LAST`             | String (Semirequired)                           |
| `ORG`              | String (Semirequired)                           |
| `MIDDLE`           | String                                          |
| `ASSOCIATED_EMAIL` | String (not a part of contact)                  |
| `EMAIL`            | String                                          |
| `PHONE`            | String                                          |
| `ADDRESS`          | Four strings separated by ; (default: "`;;;;`") |
| `TITLE`            | String                                          |
| `NICKNAME`         | String                                          |
| `URL`              | String                                          |
| `DEPARTMENT`       | String                                          |
| `NOTE`             | String                                          |
| `GENDER`           | one of: `M \| F \| O \| U`                      |
| `PREFIX`           | String                                          |
| `SUFFIX`           | String                                          |

At least one of `FIRST`, `LAST`, or `ORG` must be present.

Support for dates like `BIRTHDAY` or `ANNIVERSARY` is not yet supported.
