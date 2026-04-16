# 📃 Importing Csv Files

If you already have your club's contacts' info stored in a spreadsheet or elsewhere, Circlus has support for importing that info from a **.csv** file.

As of this writing (9-4-2020), some features are missing, but full support on par with regular VCard importing will be coming very soon.

# Example Spreadsheet

[embed](https://docs.google.com/spreadsheets/d/e/2PACX-1vRC8DjQN7AZvhfzvUmwqLphha4oxb24TNzk2D5CKXyPXVWXOXBbS_v1K1MsOopbUjmhWjOFYcr0vhXu/pubhtml?widget=true&headers=true ':include :type=iframe width=100% height=700px')

🔗 [Open Google Doc](https://docs.google.com/spreadsheets/d/10pvTuzeV2I8z0NmYBdMM4mfJr6PUw97T_1mOKg78uzU/edit?usp=sharing)

💾 [Download Example Excel File](https://docs.google.com/spreadsheets/d/e/2PACX-1vRC8DjQN7AZvhfzvUmwqLphha4oxb24TNzk2D5CKXyPXVWXOXBbS_v1K1MsOopbUjmhWjOFYcr0vhXu/pub?output=xlsx)

💾 [Download Example CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vRC8DjQN7AZvhfzvUmwqLphha4oxb24TNzk2D5CKXyPXVWXOXBbS_v1K1MsOopbUjmhWjOFYcr0vhXu/pub?gid=0&single=true&output=csv)

---

# Formatting And Columns

The first row of your spreadsheet is reserved for the names of your columns. All other rows are for your contacts.

!> Column names are _case sensitive_ and should be in all-caps, using only underscores for spaces.

There **must** be **at least one** of the following columns in your table:

| Column Name | Format | Example                  |
| :---------: | ------ | ------------------------ |
|   `FIRST`   | Text   | _John_                   |
|   `LAST`    | Text   | _Smith_                  |
|    `ORG`    | Text   | _John Smith Enterprises_ |

These columns are optional, and don't have to be in your table:

|    Column Name     | Format                              | Example                 |
| :----------------: | ----------------------------------- | ----------------------- |
| `ASSOCIATED_EMAIL` | [Associated Email](/assoc_email.md) | _`johndoe@private.com`_ |
|      `MIDDLE`      | Text                                | _Richard_               |
|     `NICKNAME`     | Text                                | _Johnny_                |
|      `PREFIX`      | Text                                | _Dr._                   |
|      `SUFFIX`      | Text                                | _Jr._                   |
|      `TITLE`       | Text                                | _CEO_                   |
|    `DEPARTMENT`    | Text                                | _Finances_              |
|     `ADDRESS`      | [Address](#address-format)          | _`;;;;Houston;TX;`_     |
|      `EMAIL`       | Email                               | _`johndoe@example.biz`_ |
|      `PHONE`       | Phone Number                        | _123-456-7890_          |
|       `URL`        | Web URL                             | _`http://example.biz/`_ |
|       `NOTE`       | Text                                | _He's a neat guy._      |
|      `GENDER`      | One of: `M`, `F`, `O`, `U`          | _`M`_                   |

# Address Format

Addresses are formatted as 7 pieces of text on a single line, separated by a `;` character. The lines are:

1. The post office box
2. The extended address (e.g., apartment or suite number)
3. The street address
4. The city
5. The region / state
6. The ZIP code
7. The country name

All of these are optional, but there must always be 6 `;` characters.

Examples:

- With an apartment: `;Apt 765;2 Enterprise Avenue;Worktown;NY;01111;USA`
- With a PO Box: `5858;;Example Lane;Albuquerque;NM;123456;`
- With a city only: `;;;;Houston;TX;`
- Empty: `;;;;;;`

# Upcoming Features

Coming Soon™️, more features will be added to CSV import:

- Support for date fields like Birthdays and Anniversaries
- Columns for different kinds of the same field, like 'Work Email' and 'Personal Email'
- Uploading contact pictures from an image URL
