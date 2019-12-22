class APIMethods {
  constructor(Model, requestedQuery) {
    this.Model = Model;
    this.requestedQuery = requestedQuery;
  }

  filter() {
    let queryObj = { ...this.requestedQuery }; //Copying to a new Object
    const excludedFields = ['page', 'sort', 'limit', 'fields']; //we will deal with them manually
    excludedFields.forEach(el => delete queryObj[el]);

    let queryString = JSON.stringify(queryObj);
    queryString = queryString.replace(
      /\b(gte|gt|lte|lt)\b/g,
      match => `$${match}`
    );
    queryObj = JSON.parse(queryString);
    // console.log(queryObj);
    this.query = this.Model.find(queryObj);
    return this;
  }

  sort() {
    if (this.requestedQuery.sort) {
      // console.log(this.requestedQuery.sort);
      const sortBy = this.requestedQuery.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
      //sort('price ratingsAverage')
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFieilds() {
    if (this.requestedQuery.fields) {
      const fields = this.requestedQuery.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.requestedQuery.page * 1 || 1;
    const limit = this.requestedQuery.limit * 1 || 100;
    const skip = (page - 1) * limit;
    //page=2&limit=10
    this.query = this.query.skip(skip).limit(limit);
    return this;

    // if (req.query.page) {
    //   Tour.countDocuments(queryObj, numTours => {
    //     if (skip >= numTours) throw new Error("This page don't exist");
    //   });
    // }
  }
}

module.exports = APIMethods;
