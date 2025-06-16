const mongoose = require("mongoose");

const schema = mongoose.Schema({
   is_active: {type:Boolean, default: true },
   created_by: {type:mongoose.SchemaTypes.ObjectId, required: true}
},{
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
})

class Catagories extends mongoose.Model {

}

schema.localClass(Catagories);
module.exports = mongoose.model("catagories",schema);
