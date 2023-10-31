class ApiFeatures {
  //Creates the query gets as  find({})
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  search() {
    const keyword = this.queryStr.keyword
      ? {
          name: {
            $regex: this.queryStr.keyword,
            $options: "i",
          },
        }
      : {};

    // console.log(keyword);
    this.query = this.query.find({ ...keyword });
    return this;
  }

  filter() {
    // make a query deep copy
    let queryCopy = { ...this.queryStr };

    //Remove non filtering keys
    const toRemove = ["keyword", "page", "limit"];
    toRemove.forEach((key) => delete queryCopy[key]);
    //We can filter with price as well when when query string is price[gt]=1200&price[lt]=2000 but it will make a object like {price: {gt:1200},{lt:2000} where $ is notpresent
    //Filter for value price/rating/number of review
    let queryCopyStr = JSON.stringify(queryCopy);
    queryCopyStr = queryCopyStr.replace(
      /\b(gt|gte|lt|lte)\b/g,
      (key) => `$${key}`
    );
    queryCopy = JSON.parse(queryCopyStr);

    this.query = this.query.find(queryCopy);
    return this;
  }

  pagination(resultPerPage) {
    const limit = this.queryStr.limit
      ? Number(this.queryStr.limit)
      : resultPerPage;
    // console.log(limit);
    const currentPage = Number(this.queryStr.page) || 1;
    const skip = resultPerPage * (currentPage - 1);
    this.query = this.query.limit(limit).skip(skip);
    return this;
  }
}

module.exports = ApiFeatures;
