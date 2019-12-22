//Now this function will work for every model where we want to delete one from the Model document
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIMethods = require('./../utils/ApiMethods');

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      throw new AppError('No document exist for that id', 404);
    }
    res.status(200).json({
      status: 'success',
      data: 'Doc Deleted'
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    if (req.body.password || req.body.password_confirm)
      throw new AppError('This router is not for password update');
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!doc) {
      throw new AppError('No document exist for that id', 404);
    }
    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/))
      query = Model.findById(req.params.id);
    else query = Model.findOne({ slug: { $regex: `.*${req.params.id}.*` } });

    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

    if (!doc) {
      throw new AppError('No document exist for that id', 404);
    }
    res.status(200).json({
      status: 'success',
      data: {
        doc
      }
    });
  });

exports.getAll = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET request for the review specific to a particular tour
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
      Model = Model.find(filter);
    }
    const docApiMethods = new APIMethods(Model, req.query);
    docApiMethods
      .filter()
      .sort()
      .limitFieilds()
      .paginate();

    let docQuery = docApiMethods.query;
    if (popOptions) docQuery = docQuery.populate(popOptions);
    // const doc = await docQuery.explain();
    const doc = await docQuery;

    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc
      }
    });
  });
